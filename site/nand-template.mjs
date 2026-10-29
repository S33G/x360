export function nandTemplate() {
  return `<section class="nand-app" data-nand-analyzer aria-label="NAND inspector">
  <header class="nand-heading">
    <div><p class="nand-kicker">LOCAL ANALYSIS / XBOX 360</p><h2>NAND inspector<span>.</span></h2><p>See the structure inside a NAND image. Your file stays in your browser.</p></div>
    <span class="nand-local"><span aria-hidden="true"></span>Client side only</span>
  </header>
  <form class="nand-input-panel" id="nand-form">
    <div class="nand-drop" id="nand-drop">
      <svg class="nand-chip" viewBox="0 0 64 64" fill="none" aria-hidden="true"><rect x="15" y="15" width="34" height="34" rx="5"/><rect x="23" y="23" width="18" height="18" rx="2"/><path d="M23 7v8m9-8v8m9-8v8M23 49v8m9-8v8m9-8v8M7 23h8m-8 9h8m-8 9h8m34-18h8m-8 9h8m-8 9h8"/></svg>
      <div class="nand-drop-copy"><h3 id="nand-file-heading">Open a NAND image</h3><p id="nand-file-summary">Drop a file here, or choose one below.</p><p class="nand-format-note">16 MiB data-only or 16.5 MiB small-block raw images.</p></div>
      <input class="nand-visually-hidden" type="file" id="nand-file" aria-label="Choose a NAND image" tabindex="-1">
      <button class="nand-button nand-primary" id="nand-choose" type="button">Choose file <span aria-hidden="true">↗</span></button>
    </div>
    <div class="nand-input-bottom">
      <details class="nand-key-details"><summary>Optional Keyvault check</summary><div class="nand-key-content"><label for="nand-key">CPU key <span>optional · 32 hex characters</span></label><input id="nand-key" type="password" maxlength="32" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="nand-key-help"><p id="nand-key-help">Used in memory for a plausibility check, then cleared. The key and decoded identity fields are never included in the browser report. A plausible result is not authentication.</p></div></details>
      <div class="nand-actions"><button class="nand-button nand-secondary" id="nand-demo" type="button">Try synthetic demo</button><button class="nand-button nand-primary" id="nand-analyze" type="submit" disabled>Inspect file <span aria-hidden="true">→</span></button></div>
    </div>
  </form>
  <div class="nand-status-row"><p id="nand-status" role="status" aria-live="polite">Ready. No file loaded.</p><div class="nand-actions"><button class="nand-text-button" id="nand-cancel" type="button" hidden>Cancel</button><button class="nand-text-button" id="nand-clear" type="button" hidden>Clear</button></div></div>
  <div class="nand-progress" id="nand-progress" role="progressbar" aria-label="Analyzing NAND image" hidden><span></span></div>
  <p class="nand-error" id="nand-error" role="alert" hidden></p>
  <div class="nand-empty" id="nand-empty">
    <div class="nand-empty-visual" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
    <div><p class="nand-kicker">STRUCTURE AT A GLANCE</p><h3>From raw bytes to a readable overview.</h3><p>Inspect block contents, bootloader candidates, SMC hints and filesystem metadata. No flashing, payloads or console connection.</p></div>
    <div class="nand-empty-facts"><span><b>01</b> Bounded parsing</span><span><b>02</b> Redacted results</span><span><b>03</b> Offline processing</span></div>
  </div>
  <div id="nand-results" hidden>
    <div class="nand-results-top"><div><p class="nand-kicker" id="nand-result-label">IMAGE OVERVIEW</p><h3 id="nand-result-title">Image structure</h3></div><div class="nand-actions"><button class="nand-button nand-secondary" id="nand-export" type="button">Export redacted JSON <span aria-hidden="true">↓</span></button></div></div>
    <div class="nand-stats" id="nand-stats"></div>
    <section class="nand-panel nand-layout-panel" aria-labelledby="nand-layout-title"><div class="nand-section-heading"><div><p class="nand-kicker">01 / DATA LAYOUT</p><h3 id="nand-layout-title">Inside the image</h3></div><span class="nand-subtle">Schematic · small regions enlarged</span></div><div class="nand-regions" id="nand-regions"></div><p class="nand-region-detail" id="nand-region-detail" aria-live="polite"></p></section>
    <section class="nand-panel" aria-labelledby="nand-map-title"><div class="nand-section-heading"><div><p class="nand-kicker">02 / BLOCK MAP</p><h3 id="nand-map-title">Every block, at a glance</h3></div><span class="nand-subtle" id="nand-map-count"></span></div>
      <div class="nand-map-legend"><span><i class="nand-swatch nand-swatch-data"></i>Contains data</span><span><i class="nand-swatch nand-swatch-erased"></i>Erased</span><span><i class="nand-swatch nand-swatch-bad"></i>Bad-block marker</span></div>
      <canvas id="nand-map" tabindex="0" role="group" aria-label="Interactive block map. Use arrow keys to select a block. Home and End select the first and last blocks." aria-describedby="nand-block-detail">Use the block number control below to inspect individual blocks.</canvas>
      <div class="nand-map-controls"><p id="nand-block-detail" aria-live="polite"></p><div class="nand-block-picker"><button class="nand-button nand-square" id="nand-block-prev" type="button" aria-label="Previous block">←</button><label for="nand-block-index">Block</label><input id="nand-block-index" type="number" min="0" max="1023" step="1" value="0"><button class="nand-button nand-square" id="nand-block-next" type="button" aria-label="Next block">→</button></div></div>
      <p class="nand-footnote">Colors describe bytes and spare-area markers. They do not establish NAND health, ECC correctness or successful remapping.</p>
    </section>
    <div class="nand-details-grid"><section class="nand-panel" aria-labelledby="nand-boot-title"><div class="nand-section-heading"><div><p class="nand-kicker">03 / BOOT CHAIN</p><h3 id="nand-boot-title">Bootloader candidates</h3></div></div><div id="nand-boot"></div><p class="nand-footnote">Header matches are candidates, not signature verification or proof that a console can boot.</p></section>
    <section class="nand-panel" aria-labelledby="nand-smc-title"><div class="nand-section-heading"><div><p class="nand-kicker">04 / CONTROLLER</p><h3 id="nand-smc-title">SMC &amp; Keyvault</h3></div></div><div id="nand-smc"></div><div class="nand-kv" id="nand-kv"></div></section></div>
    <section class="nand-panel" aria-labelledby="nand-files-title"><div class="nand-section-heading"><div><p class="nand-kicker">05 / FILESYSTEM</p><h3 id="nand-files-title">Directory metadata</h3></div><span class="nand-subtle" id="nand-fs-status"></span></div><div id="nand-files"></div><p class="nand-footnote">Names are redacted. Metadata is not a filesystem extraction; allocation chains and file contents are not verified.</p></section>
    <section class="nand-caveats" aria-labelledby="nand-caveats-title"><h3 id="nand-caveats-title">Read this alongside the result</h3><ul id="nand-warnings"></ul><p>Reports may still identify a console through their structure. Keep exports private. This tool cannot choose a safe exploit or establish whether a dump is flashable.</p></section>
  </div>
  <noscript><p class="nand-error">The inspector needs JavaScript to process a file locally. The guide and downloadable Node tool remain available below.</p></noscript>
</section>`;
}
