(function() {
    // 1. INJECT CSS
    const css = `
    #a11y-toggle { position: fixed; bottom: 1.5rem; left: 1.5rem; background: #009FE3; color: white; padding: 1rem; border-radius: 9999px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); cursor: pointer; z-index: 9999; transition: background-color 0.2s; font-size: 1.2rem; border: none; }
    #a11y-toggle:hover { background: #00609C; }
    
    #a11y-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10000; display: none; align-items: center; justify-content: center; padding: 2rem; opacity: 0; transition: opacity 0.3s; font-family: 'Open Sans', sans-serif; }
    #a11y-modal-overlay.active { display: flex; opacity: 1; }
    #a11y-modal-box { background: #FFFFFF; border-radius: 8px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
    #a11y-modal-header { padding: 1.5rem 2rem; border-bottom: 1px solid #C7DEED; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: #FFFFFF; z-index: 10; }
    #a11y-modal-title { font-weight: 700; font-size: 1.25rem; color: #000000; }
    .a11y-subtitle { font-size: 0.8rem; color: #555555; display: block; margin-top: 0.25rem; font-weight: 400; }
    .a11y-close { width: 32px; height: 32px; border-radius: 4px; background: transparent; border: 1px solid transparent; color: #555555; cursor: pointer; display: grid; place-items: center; transition: all 0.2s; font-size: 1rem; }
    .a11y-close:hover { background: #E3EDF4; color: #000000; }
    #a11y-modal-body { padding: 2rem; }
    
    .a11y-form-label { display: block; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; color: #555555; margin-bottom: 0.5rem; font-weight: 600; }
    .a11y-select { width: 100%; background: #F4F2EE; border: 1px solid #B5A38F; color: #000000; padding: 0.6rem 0.9rem; border-radius: 4px; font-family: inherit; font-size: 0.95rem; }
    
    .a11y-section-title { font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #00609C; margin: 1.5rem 0 0.75rem; border-bottom: 1px solid #C7DEED; padding-bottom: 0.5rem; }
    .a11y-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    @media (max-width: 480px) { .a11y-grid { grid-template-columns: repeat(2, 1fr); } }
    
    .a11y-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 15px 5px; border-radius: 8px; background: #F4F2EE; border: 1px solid #C7DEED; text-align: center; cursor: pointer; transition: all 0.2s; font-family: inherit; font-size: 0.8rem; color: #000000; font-weight: 600; }
    .a11y-btn:hover { background: #E3EDF4; border-color: #009FE3; }
    .a11y-btn.active { background: #009FE3; color: white; border-color: #009FE3; box-shadow: 0 4px 10px rgba(0, 159, 227, 0.3); }
    .a11y-btn i { font-size: 1.3rem; }
    
    /* Font Size Control */
    .a11y-size-control { display: flex; align-items: center; justify-content: space-between; background: #F4F2EE; border: 1px solid #C7DEED; border-radius: 8px; padding: 10px 15px; margin-bottom: 10px; }
    .a11y-size-label { font-weight: 600; font-size: 0.9rem; color: #000000; display: flex; align-items: center; gap: 8px; }
    .a11y-size-btns { display: flex; align-items: center; gap: 10px; }
    .a11y-size-btn { width: 32px; height: 32px; border-radius: 6px; background: #FFFFFF; border: 1px solid #B5A38F; color: #000000; font-size: 1.2rem; font-weight: bold; cursor: pointer; display: grid; place-items: center; transition: all 0.2s; }
    .a11y-size-btn:hover { background: #009FE3; color: white; border-color: #009FE3; }
    .a11y-size-display { font-weight: bold; min-width: 45px; text-align: center; font-size: 0.9rem; }
    
    .a11y-reset-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; margin-top: 1.5rem; padding: 12px; background: #009FE3; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s; font-family: inherit; }
    .a11y-reset-btn:hover { background: #00609C; }

    /* Effects */
    body.a11y-line-height * { line-height: 2 !important; }
    body.a11y-letter-spacing * { letter-spacing: 2px !important; }
    body.a11y-text-align * { text-align: left !important; }
    body.a11y-font-weight * { font-weight: bold !important; }
    body.a11y-highlight-links a { text-decoration: underline; text-decoration-color: #E30613; text-decoration-thickness: 3px; color: #000 !important; font-weight: bold; }
    body.a11y-readable-font, body.a11y-readable-font * { font-family: 'Arial', 'Helvetica', sans-serif !important; letter-spacing: normal !important; }
    body.a11y-big-cursor { cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='50' viewBox='0 0 40 50'><path d='M 0,0 L 0,40 L 10,30 L 20,50 L 26,47 L 16,27 L 30,27 Z' fill='black' stroke='white' stroke-width='2'/></svg>") 0 0, auto !important; }
    body.a11y-light-contrast { background: #fff !important; color: #000 !important; }
    body.a11y-light-contrast *:not(i):not(.a11y-btn) { background: transparent !important; color: #000 !important; border-color: #ddd !important; }
    body.a11y-high-contrast { background: #000 !important; color: #ffeb3b !important; }
    body.a11y-high-contrast *:not(i):not(.a11y-btn):not(.a11y-size-btn) { background: transparent !important; color: #ffeb3b !important; border-color: #ffeb3b !important; }
    body.a11y-high-contrast a { color: #00ffff !important; text-decoration: underline; }
    body.a11y-high-contrast img { filter: grayscale(100%) contrast(1.5); }
    body.a11y-monochrome { filter: grayscale(100%) contrast(1.1); }
    body.a11y-hide-images img { visibility: hidden !important; }
    body.a11y-hide-images .article-image { background: #eee !important; border-bottom: 1px solid #ccc; }

    #a11y-reading-line { display: none; position: fixed; left: 0; width: 100%; height: 30px; background: rgba(0, 159, 227, 0.3); border-top: 2px solid #009FE3; border-bottom: 2px solid #009FE3; z-index: 9998; pointer-events: none; }
    body.a11y-reading-line #a11y-reading-line { display: block; }
    #a11y-mask-top, #a11y-mask-bottom { display: none; position: fixed; left: 0; width: 100%; height: 50%; background: rgba(0,0,0,0.75); z-index: 9998; pointer-events: none; }
    #a11y-mask-top { top: 0; } #a11y-mask-bottom { bottom: 0; }
    body.a11y-reading-mask #a11y-mask-top, body.a11y-reading-mask #a11y-mask-bottom { display: block; }
    `;

    const style = document.createElement('style');
    style.innerHTML = css;
    document.head.appendChild(style);

    // 2. INJECT HTML
    const html = `
    <button id="a11y-toggle" title="Tillgänglighet"><i class="fa-solid fa-universal-access"></i></button>
    
    <div id="a11y-modal-overlay">
      <div id="a11y-modal-box">
        <div id="a11y-modal-header">
          <div>
            <h2 id="a11y-modal-title">Tillgänglighetsinställningar</h2>
            <span class="a11y-subtitle">Svenska • Byggd av OneTap</span>
          </div>
          <button class="a11y-close" id="a11y-close-btn"><i class="fas fa-times"></i></button>
        </div>
        <div id="a11y-modal-body">
          
          <div style="margin-bottom: 1.5rem;">
            <label class="a11y-form-label" for="skipToContent">Hoppa till innehåll</label>
            <select class="a11y-select" id="a11y-skip-content">
              <option value="">Välj...</option>
              <option value="main">Huvudinnehåll</option>
              <option value="nav">Navigation</option>
              <option value="footer">Sidfot</option>
            </select>
          </div>

          <h3 class="a11y-section-title">Innehållsmoduler</h3>
          
          <div class="a11y-size-control">
            <span class="a11y-size-label"><i class="fa-solid fa-text-height"></i> Teckenstorlek</span>
            <div class="a11y-size-btns">
              <button class="a11y-size-btn" id="a11y-font-decrease">-</button>
              <span class="a11y-size-display" id="a11y-font-display">100%</span>
              <button class="a11y-size-btn" id="a11y-font-increase">+</button>
            </div>
          </div>

          <div class="a11y-grid">
            <button class="a11y-btn" data-feature="line-height"><i class="fa-solid fa-arrows-up-down"></i> Radhöjd</button>
            <button class="a11y-btn" data-feature="letter-spacing"><i class="fa-solid fa-arrows-left-right"></i> Bokstavsavstånd</button>
            <button class="a11y-btn" data-feature="readable-font"><i class="fa-solid fa-font"></i> Läslig font</button>
            <button class="a11y-btn" data-feature="big-cursor"><i class="fa-solid fa-arrow-pointer"></i> Stor muspekare</button>
            <button class="a11y-btn" data-feature="text-align"><i class="fa-solid fa-align-left"></i> Justera text</button>
            <button class="a11y-btn" data-feature="font-weight"><i class="fa-solid fa-bold"></i> Teckenvikt</button>
            <button class="a11y-btn" data-feature="highlight-links"><i class="fa-solid fa-link"></i> Markera länkar</button>
          </div>

          <h3 class="a11y-section-title">Färgmoduler</h3>
          <div class="a11y-grid">
            <button class="a11y-btn" data-feature="light-contrast"><i class="fa-solid fa-sun"></i> Ljus kontrast</button>
            <button class="a11y-btn" data-feature="high-contrast"><i class="fa-solid fa-circle-half-stroke"></i> Hög kontrast</button>
            <button class="a11y-btn" data-feature="monochrome"><i class="fa-solid fa-palette"></i> Monokrom</button>
          </div>

          <h3 class="a11y-section-title">Orientationsmoduler</h3>
          <div class="a11y-grid">
            <button class="a11y-btn" data-feature="reading-line"><i class="fa-solid fa-minus"></i> Läsrad</button>
            <button class="a11y-btn" data-feature="reading-mask"><i class="fa-solid fa-bars-staggered"></i> Läsmask</button>
            <button class="a11y-btn" data-feature="hide-images"><i class="fa-solid fa-image"></i> Dölj bilder</button>
          </div>

          <button class="a11y-reset-btn" id="a11y-reset-btn">
            <i class="fa-solid fa-rotate-left"></i> Återställ inställningar
          </button>
        </div>
      </div>
    </div>

    <div id="a11y-reading-line"></div>
    <div id="a11y-mask-top"></div>
    <div id="a11y-mask-bottom"></div>
    `;

    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    // 3. JAVASCRIPT LOGIC
    let currentFontSize = 100;

    const overlay = document.getElementById('a11y-modal-overlay');
    const toggleBtn = document.getElementById('a11y-toggle');
    const closeBtn = document.getElementById('a11y-close-btn');
    const featureBtns = document.querySelectorAll('.a11y-btn[data-feature]');
    const resetBtn = document.getElementById('a11y-reset-btn');
    const fontIncrease = document.getElementById('a11y-font-increase');
    const fontDecrease = document.getElementById('a11y-font-decrease');
    const fontDisplay = document.getElementById('a11y-font-display');
    const skipSelect = document.getElementById('a11y-skip-content');

    function openModal() { overlay.classList.add('active'); }
    function closeModal() { overlay.classList.remove('active'); }

    toggleBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    // Toggle features
    featureBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const feature = btn.getAttribute('data-feature');
            document.body.classList.toggle('a11y-' + feature);
            btn.classList.toggle('active');
        });
    });

    // Font size controls
    function updateFontSize(change) {
        currentFontSize = Math.max(80, Math.min(150, currentFontSize + change));
        document.body.style.fontSize = currentFontSize + '%';
        fontDisplay.innerText = currentFontSize + '%';
    }

    fontIncrease.addEventListener('click', () => updateFontSize(10));
    fontDecrease.addEventListener('click', () => updateFontSize(-10));

    // Reset
    resetBtn.addEventListener('click', () => {
        document.body.classList.remove(
            'a11y-line-height', 'a11y-letter-spacing', 'a11y-readable-font', 
            'a11y-big-cursor', 'a11y-text-align', 'a11y-font-weight', 'a11y-highlight-links',
            'a11y-light-contrast', 'a11y-high-contrast', 'a11y-monochrome', 
            'a11y-reading-line', 'a11y-reading-mask', 'a11y-hide-images'
        );
        featureBtns.forEach(btn => btn.classList.remove('active'));
        
        // Reset font size
        currentFontSize = 100;
        document.body.style.fontSize = '';
        fontDisplay.innerText = '100%';
    });

    // Skip to content
    skipSelect.addEventListener('change', (e) => {
        const target = e.target.value;
        if (!target) return;
        let el;
        if (target === 'main') el = document.querySelector('main') || document.querySelector('#main');
        if (target === 'nav') el = document.querySelector('nav');
        if (target === 'footer') el = document.querySelector('footer');
        
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            e.target.value = '';
        }
    });

    // Reading line and mask mouse tracking
    document.addEventListener('mousemove', (e) => {
        if (document.body.classList.contains('a11y-reading-line')) {
            const line = document.getElementById('a11y-reading-line');
            if (line) line.style.top = (e.clientY - 15) + 'px';
        }
        if (document.body.classList.contains('a11y-reading-mask')) {
            const topMask = document.getElementById('a11y-mask-top');
            const bottomMask = document.getElementById('a11y-mask-bottom');
            if (topMask) topMask.style.height = (e.clientY - 50) + 'px';
            if (bottomMask) bottomMask.style.height = (window.innerHeight - e.clientY - 50) + 'px';
        }
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'E' && !overlay.classList.contains('active')) openModal();
    });

})();