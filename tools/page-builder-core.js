/**
 * sqs-builder — turns a small page SPEC into the full Squarespace section/block
 * JSON, validates it, and (in the browser console) writes it to a new page.
 *
 * The model (Haiku/Sonnet/local) only ever writes the SPEC. This file owns the
 * parts that fail silently if wrong: 24-char hex ids, span sums, enum values,
 * block shapes, the region-id swap, and the preview-before-commit step.
 *
 *   Node (offline, no writes):   const B = require('./page-builder.js'); B.build(spec)
 *   Browser console (live site): await SQSPage.preview(spec); await SQSPage.commit();
 *
 * Block shapes below are copied from lib/blocks/block-library.js and
 * scripts/build-test-page.js (the confirmed end-to-end write).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SQSPage = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  // ---------- allowed values (single source of truth: validator + model guide) ----------
  const ENUMS = {
    height: { small: 'section-height--small', medium: 'section-height--medium', large: 'section-height--large' },
    width: { narrow: 'content-width--narrow', medium: 'content-width--medium', wide: 'content-width--wide' },
    background: { 'full-bleed': 'background-width--full-bleed', inset: 'background-width--inset' },
    align: { left: 'horizontal-alignment--left', center: 'horizontal-alignment--center' },
    valign: { top: 'vertical-alignment--top', middle: 'vertical-alignment--middle', bottom: 'vertical-alignment--bottom' },
    theme: { none: '', white: 'white', 'white-bold': 'white-bold', light: 'light', 'light-bold': 'light-bold',
             bright: 'bright', 'bright-inverse': 'bright-inverse', dark: 'dark', 'dark-bold': 'dark-bold',
             black: 'black', 'black-bold': 'black-bold' },
    textAlign: ['left', 'center', 'right'],
    buttonSize: ['small', 'medium', 'large'],
    imageLayout: ['inline', 'poster', 'card', 'overlap', 'collage', 'stack'],
  };

  const BLOCK_KINDS = {
    heading: { required: ['text'], optional: ['level', 'align'] },
    text:    { required: ['paragraphs'], optional: ['align'] },
    button:  { required: ['text'], optional: ['link', 'align', 'size'] },
    spacer:  { required: [], optional: ['size'] },
    image:   { required: ['imageId'], optional: ['layout', 'title', 'subtitle'] },
    gallery: { required: [], optional: ['collectionId'] },
  };

  // ---------- ids ----------
  // Real ids are 24-char lowercase hex ObjectIds. Any other shape/length = silent empty-body 400.
  function randomId() {
    const c = 'abcdef0123456789'; let s = '';
    for (let i = 0; i < 24; i++) s += c[Math.floor(Math.random() * 16)];
    return s;
  }

  // ---------- validation ----------
  function validate(spec) {
    const errs = [];
    const err = (path, msg) => errs.push(`${path}: ${msg}`);
    const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
    const checkKeys = (path, o, allowed) => Object.keys(o).forEach((k) => { if (!allowed.includes(k)) err(path, `unknown key "${k}" (allowed: ${allowed.join(', ')})`); });

    if (!isObj(spec)) return ['spec: must be an object'];
    checkKeys('spec', spec, ['title', 'sections']);
    if (typeof spec.title !== 'string' || !spec.title.trim()) err('spec.title', 'required non-empty string');
    if (!Array.isArray(spec.sections) || !spec.sections.length) { err('spec.sections', 'required non-empty array'); return errs; }

    spec.sections.forEach((sec, si) => {
      const sp = `sections[${si}]`;
      if (!isObj(sec)) return err(sp, 'must be an object');
      checkKeys(sp, sec, ['height', 'width', 'background', 'align', 'valign', 'theme', 'backgroundImageId', 'blocks', 'rows']);
      for (const k of ['height', 'width', 'background', 'align', 'valign', 'theme']) {
        if (sec[k] !== undefined && !(sec[k] in ENUMS[k])) err(`${sp}.${k}`, `"${sec[k]}" not one of: ${Object.keys(ENUMS[k]).join(', ')}`);
      }
      if ((sec.blocks === undefined) === (sec.rows === undefined)) return err(sp, 'give exactly one of "blocks" (single full-width row) or "rows"');
      const rows = sec.rows || [[{ span: 12, blocks: sec.blocks }]];
      if (!Array.isArray(rows)) return err(`${sp}.rows`, 'must be an array of rows');
      rows.forEach((row, ri) => {
        const rp = `${sp}.rows[${ri}]`;
        if (!Array.isArray(row) || !row.length) return err(rp, 'a row is a non-empty array of columns');
        let total = 0;
        row.forEach((col, ci) => {
          const cp = `${rp}[${ci}]`;
          if (!isObj(col)) return err(cp, 'column must be an object {span, blocks}');
          checkKeys(cp, col, ['span', 'blocks']);
          if (!Number.isInteger(col.span) || col.span < 1 || col.span > 12) err(`${cp}.span`, 'integer 1-12');
          else total += col.span;
          if (!Array.isArray(col.blocks)) return err(`${cp}.blocks`, 'array required (can be empty)');
          col.blocks.forEach((b, bi) => validateBlock(`${cp}.blocks[${bi}]`, b));
        });
        if (total !== 12) err(rp, `column spans sum to ${total}, must be 12`);
      });
    });
    return errs;

    function validateBlock(path, b) {
      if (!isObj(b)) return err(path, 'block must be an object');
      const def = BLOCK_KINDS[b.type];
      if (!def) return err(`${path}.type`, `"${b.type}" not one of: ${Object.keys(BLOCK_KINDS).join(', ')}`);
      checkKeys(path, b, ['type', ...def.required, ...def.optional]);
      def.required.forEach((k) => { if (b[k] === undefined) err(`${path}.${k}`, 'required'); });
      if (b.level !== undefined && ![1, 2, 3, 4].includes(b.level)) err(`${path}.level`, 'one of 1,2,3,4');
      if (b.align !== undefined && !ENUMS.textAlign.includes(b.align)) err(`${path}.align`, `one of ${ENUMS.textAlign.join(', ')}`);
      if (b.size !== undefined && b.type === 'button' && !ENUMS.buttonSize.includes(b.size)) err(`${path}.size`, `one of ${ENUMS.buttonSize.join(', ')}`);
      if (b.size !== undefined && b.type === 'spacer' && !(Number.isInteger(b.size) && b.size >= 1 && b.size <= 20)) err(`${path}.size`, 'integer 1-20');
      if (b.layout !== undefined && !ENUMS.imageLayout.includes(b.layout)) err(`${path}.layout`, `one of ${ENUMS.imageLayout.join(', ')}`);
      if (b.type === 'text' && !(Array.isArray(b.paragraphs) && b.paragraphs.every((p) => typeof p === 'string'))) err(`${path}.paragraphs`, 'array of strings');
      if (b.imageId !== undefined && !/^[0-9a-f]{24}$/.test(b.imageId)) err(`${path}.imageId`, 'must be a 24-char hex id from the media library pipeline');
      if (b.collectionId !== undefined && !/^[0-9a-f]{24}$/.test(b.collectionId)) err(`${path}.collectionId`, 'must be a 24-char hex id');
    }
  }

  // ---------- block builders ----------
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const alignCss = (a) => (a === 'center' ? 'text-align: center; ' : a === 'right' ? 'text-align: right; ' : '');
  const TRANSFORMS = { offset: { x: { unit: 'px', value: 0 }, y: { unit: 'px', value: 0 } }, opacity: { unit: '%', value: 100 }, origin: { x: { unit: '%', value: 50 }, y: { unit: '%', value: 50 } }, rotation: { z: { unit: 'deg', value: 0 } }, scale: { x: { unit: '%', value: 100 }, y: { unit: '%', value: 100 } }, skew: { x: { unit: 'deg', value: 0 }, y: { unit: 'deg', value: 0 } } };
  const RADII = { topLeft: { unit: 'px', value: 0 }, topRight: { unit: 'px', value: 0 }, bottomLeft: { unit: 'px', value: 0 }, bottomRight: { unit: 'px', value: 0 } };

  function textValue(html) {
    return {
      engine: 'wysiwyg', html, source: html, textAttributes: [],
      containerStyles: {
        backgroundEnabled: false, backgroundColor: { type: 'THEME_COLOR' }, borderRadii: RADII,
        padding: { top: { unit: '%', value: 6 }, right: { unit: '%', value: 6 }, bottom: { unit: '%', value: 6 }, left: { unit: '%', value: 6 } },
        stretchedToFill: false,
        stroke: { style: 'none', color: { type: 'SITE_PALETTE_COLOR', sitePaletteColor: { colorName: 'black', alphaModifier: 1 } }, thickness: { unit: 'px', value: 2 } },
        blendMode: 'normal', blur: { enabled: false, filterType: 'backdrop', blurRadius: { unit: 'px', value: 15 } },
      },
      animations: [], breakpointOverrides: [], transforms: TRANSFORMS, hSize: null, floatDir: null,
    };
  }
  const caption = (t) => ({ engine: 'wysiwyg', source: '', html: t ? `<p class="" style="white-space:pre-wrap;">${esc(t)}</p>` : '' });

  const BUILDERS = {
    heading: (b) => ({ type: 1337, definitionName: 'website.components.html',
      value: textValue(`<h${b.level || 2} style="${alignCss(b.align)}white-space:pre-wrap;" data-rte-preserve-empty="true">${esc(b.text)}</h${b.level || 2}>`) }),
    text: (b) => ({ type: 1337, definitionName: 'website.components.html',
      value: textValue(b.paragraphs.map((p) => `<p style="${alignCss(b.align)}white-space:pre-wrap;">${esc(p)}</p>`).join('')) }),
    button: (b) => ({ type: 1337, definitionName: 'website.components.button',
      value: { buttonText: b.text, buttonLink: b.link || null, buttonAlignment: b.align || 'center', buttonSize: b.size || 'medium',
        newWindow: false, containerStyles: { stretchedToFill: false }, animations: [], breakpointOverrides: [], transforms: TRANSFORMS, hSize: null, floatDir: null } }),
    spacer: (b) => ({ type: 1337, definitionName: 'website.components.spacer',
      value: { aspectRatio: null, vSize: b.size || 1, hSize: null, floatDir: null } }),
    image: (b) => ({ type: 5, value: {
      imageId: b.imageId, linkTo: '', newwindow: false, imageLink: 'none', buttonText: '', lightbox: false, lightboxTheme: 'dark',
      combinationAnimation: 'site-default', individualImageAnimation: 'site-default', individualTextAnimation: 'site-default',
      aspectRatio: null, layout: 'caption-below', stretch: false,
      description: caption(''), title: caption(b.title), subtitle: caption(b.subtitle),
      designLayout: b.layout || 'inline', imagePosition: 'left', mapping: null, imageCropType: 'css_styles', imageMask: 'circle',
      borderRadii: RADII, imageOverlay: { enabled: false, color: { type: 'THEME_COLOR' }, blendMode: 'normal' }, imageEffect: { type: 'none' },
      floatDir: null, hSize: null, containerStyles: { backgroundEnabled: false, stretchedToFill: false } } }),
    gallery: (b) => ({ type: 8, value: {
      'aspect-ratio': 'standard', aspectRatio: null, 'auto-crop': true, blockAnimation: 'none',
      collectionId: b.collectionId || null, design: 'grid', lightbox: false, padding: 20,
      'show-meta': true, 'show-meta-basic': true, 'show-meta-only-title': false, 'show-meta-only-description': false,
      'square-thumbs': true, 'thumbnails-per-row': 4, vSize: null, hSize: null, floatDir: null,
      methodOption: 'transient', existingGallery: null, newWindow: false, transientGalleryId: b.collectionId || null } }),
  };

  // ---------- spec -> sections ----------
  function build(spec) {
    const errs = validate(spec);
    if (errs.length) { const e = new Error('Invalid page spec:\n - ' + errs.join('\n - ')); e.errors = errs; throw e; }
    const pick = (sec, k, dflt) => ENUMS[k][sec[k] !== undefined ? sec[k] : dflt];
    return spec.sections.map((sec) => {
      const rows = (sec.rows || [[{ span: 12, blocks: sec.blocks }]]).map((row) => ({
        columns: row.map((col) => ({ span: col.span, blocks: col.blocks.map((b) => ({ id: randomId(), ...BUILDERS[b.type](b) })) })),
      }));
      const section = {
        sectionName: 'LAYOUT_ENGINE', id: randomId(), isCloneable: false, video: { zoom: 0 },
        styles: {
          backgroundWidth: pick(sec, 'background', 'full-bleed'), imageOverlayOpacity: sec.backgroundImageId ? 0.15 : 0.15,
          sectionHeight: pick(sec, 'height', 'medium'), customSectionHeight: 10,
          horizontalAlignment: pick(sec, 'align', 'center'), verticalAlignment: pick(sec, 'valign', 'middle'),
          contentWidth: pick(sec, 'width', 'wide'), customContentWidth: 50,
          sectionTheme: pick(sec, 'theme', 'none'), sectionAnimation: 'none', backgroundMode: 'image',
        },
        sourceType: 'blank', createdOn: Date.now(), content: { raw: false, layout: { columns: 12, rows } },
      };
      if (sec.backgroundImageId) section.backgroundImageId = sec.backgroundImageId;
      return section;
    });
  }

  // Compact human-readable outline for the preview step.
  function outline(spec) {
    return spec.sections.map((s, i) => {
      const rows = s.rows || [[{ span: 12, blocks: s.blocks }]];
      const body = rows.map((r) => r.map((c) => `[${c.span}: ${c.blocks.map((b) => b.type + (b.text ? ` "${b.text}"` : '')).join(', ') || 'empty'}]`).join(' ')).join(' / ');
      return `${i + 1}. ${s.height || 'medium'}/${s.theme || 'no theme'}  ${body}`;
    }).join('\n');
  }

  // Short guide to paste into the cheap model's system prompt.
  const specGuide = () => [
    'Output ONLY a JSON page spec: {"title": str, "sections": [Section]}.',
    'Section: {height?, width?, background?, align?, valign?, theme?, backgroundImageId?} plus EITHER "blocks":[Block] (one full-width row) OR "rows":[[{"span":1-12,"blocks":[Block]}]] (spans in a row must sum to 12).',
    ...Object.keys(ENUMS).filter((k) => !Array.isArray(ENUMS[k])).map((k) => `${k}: ${Object.keys(ENUMS[k]).join(' | ')}`),
    'Blocks: ' + Object.entries(BLOCK_KINDS).map(([k, d]) => `{"type":"${k}"${[...d.required, ...d.optional.map((o) => o + '?')].map((f) => ', ' + f).join('')}}`).join('  '),
    'Heading level 1-4. Images/gallery need real 24-hex ids; never invent them - omit the block if none given.',
  ].join('\n');

  // ---------- browser runner (needs a Squarespace admin tab) ----------
  const browser = {};
  if (typeof document !== 'undefined') {
    const getCookie = (n) => { const p = ('; ' + document.cookie).split('; ' + n + '='); if (p.length === 2) return p.pop().split(';').shift(); };
    async function api(path, method, body) {
      const res = await fetch(`${location.protocol}//${location.host}/api/${path}`, {
        method, credentials: 'include',
        headers: { accept: 'application/json, text/plain, */*', 'x-csrf-token': getCookie('crumb'), ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body || undefined,
      });
      const raw = await res.text();
      if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${raw.slice(0, 300)}`);
      return raw ? JSON.parse(raw) : null;
    }
    async function websiteId() {
      const data = await api('commondata/GetCollections', 'GET');
      const first = data && data.collections && Object.values(data.collections)[0];
      if (!first || !first.websiteId) throw new Error('Could not resolve websiteId');
      return first.websiteId;
    }
    let pending = null;
    browser.preview = async function (spec) {      // validates + prints outline; writes NOTHING
      const sections = build(spec);                 // throws with every error listed
      pending = { spec, sections };
      console.log(`Will create page "${spec.title}" (not linked in nav) with ${sections.length} sections:\n` + outline(spec));
      console.log('Looks right? await SQSPage.commit()');
      return sections;
    };
    browser.commit = async function (specArg) {     // the only function that writes
      if (!specArg && !pending) throw new Error('Run SQSPage.preview(spec) first, or pass the spec: SQSPage.commit(spec).');
      const spec = specArg || pending.spec;
      const sections = build(spec);                 // fresh ids at commit time
      const wid = await websiteId();
      const created = await api('commondata/SaveCollectionSettings', 'POST', JSON.stringify({
        collectionData: {
          description: { html: '', raw: false }, enabled: true, deleted: false, folder: false, regionName: 'default', dirty: false, body: null,
          collectionType: 10, supported: true, supportsVideoBackgrounds: false, typeName: 'page',
          title: spec.title, newTitle: spec.title, ordering: 3, icon: 'page', addText: 'Add Block',
          navigationTitle: spec.title, type: 10, websiteId: wid },
        memberAreaData: { memberAreaIds: [] } }));
      if (!created || !created.id) throw new Error('Page creation returned no id');
      const page = await api(`pages/by-collection-id/${created.id}`, 'GET');
      const region = page.regions[0];               // the NEW page's own region id (gotcha #2)
      sections.forEach((s) => { s.regionId = region.id; });
      region.sections = sections; region.ownerId = created.id;
      await api(`pages/by-collection-id/${created.id}`, 'PUT', JSON.stringify({ regions: [region] }));
      pending = null;
      console.log(`Done: /${created.urlId} (id ${created.id}). Find it under "Not Linked" in the Pages panel.`);
      return { pageId: created.id, urlId: created.urlId };
    };
  }

  return { validate, build, outline, specGuide, ENUMS, BLOCK_KINDS, randomId, ...browser };
});
