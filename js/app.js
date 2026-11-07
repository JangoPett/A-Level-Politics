// --- COMBINE MODULAR SPECIFICATION DATA (VERSION 2.0) ---
const SPEC_DATA = {
  papers: [
    {
      paperId: "paper1",
      title: "Paper 1: UK Politics and Core Political Ideas",
      modules: [
        ...window.PAPER1_UK.modules,
        ...window.PAPER1_CORE.modules
      ]
    },
    {
      paperId: "paper2",
      title: "Paper 2: UK Government and Non-core Political Ideas",
      modules: [
        ...window.PAPER2_UK.modules,
        ...window.PAPER2_FEMINISM.modules
      ]
    },
    {
      paperId: "paper3",
      title: "Paper 3: Comparative Politics — US Politics",
      modules: [
        ...window.PAPER3_US.modules
      ]
    }
  ]
};

// --- STATE MANAGEMENT ---
let appState = {
  theme: "dark",
  bulletStatuses: {},
  questionStatuses: {}
};

function loadState() {
  const saved = localStorage.getItem("politics_tracker_state_v2");
  if (saved) {
    appState = { ...appState, ...JSON.parse(saved) };
  }
  document.body.classList.toggle("light-mode", appState.theme === "light");
}

function saveState() {
  localStorage.setItem("politics_tracker_state_v2", JSON.stringify(appState));
  updateProgress();
}

// --- WEIGHTED AVERAGE ROLLUP ENGINE ---
function getSubsectionStatus(sub) {
  if (!sub.bullets || sub.bullets.length === 0) return 0;
  const scores = sub.bullets.map(b => appState.bulletStatuses[b.id] || 0);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg);
}

function getModuleStatus(mod) {
  if (!mod.subsections || mod.subsections.length === 0) return 0;
  const scores = mod.subsections.map(s => getSubsectionStatus(s));
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg);
}

function getPaperStatus(paper) {
  if (!paper.modules || paper.modules.length === 0) return 0;
  const scores = paper.modules.map(m => getModuleStatus(m));
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg);
}

function getStatusBadgeHtml(statusNum) {
  const labels = [
    "🔴 Not Started",
    "🟠 Some Notes Done",
    "🟡 Most Terms & Thinkers Memorised",
    "🟢 Exam Ready"
  ];
  return `<span class="status-badge status-${statusNum}">${labels[statusNum]}</span>`;
}

// --- RENDER APPLICATION ---
function render() {
  const container = document.getElementById("appContainer");
  container.innerHTML = "";

  SPEC_DATA.papers.forEach(paper => {
    const paperEl = document.createElement("div");
    paperEl.className = "paper-card";
    paperEl.id = `paper_${paper.paperId}`;

    const paperStat = getPaperStatus(paper);
    let paperHtml = `<div class="paper-title">
      <span>${paper.title}</span>
      <span id="badge_${paper.paperId}">${getStatusBadgeHtml(paperStat)}</span>
    </div>`;

    paper.modules.forEach(mod => {
      const modStat = getModuleStatus(mod);
      let subHtml = "";

      mod.subsections.forEach(sub => {
        const subStat = getSubsectionStatus(sub);

        let bulletsHtml = `<div class="section-subtitle">Specification Bullet Points</div>`;
        sub.bullets.forEach(b => {
          const bStat = appState.bulletStatuses[b.id] || 0;
          bulletsHtml += `
            <div class="bullet-item">
              <span class="bullet-text"><span class="bullet-symbol">•</span><span>${b.text}</span></span>
              <select class="status-select status-${bStat}" id="select_${b.id}" onchange="updateBulletStatus('${b.id}', '${sub.id}', '${mod.id}', '${paper.paperId}', this.value)">
                <option value="0" class="status-0" ${bStat==0?'selected':''}>🔴 Not Started</option>
                <option value="1" class="status-1" ${bStat==1?'selected':''}>🟠 Some Notes Done</option>
                <option value="2" class="status-2" ${bStat==2?'selected':''}>🟡 Most Terms & Thinkers Memorised</option>
                <option value="3" class="status-3" ${bStat==3?'selected':''}>🟢 Exam Ready</option>
              </select>
            </div>`;
        });

        let thinkersHtml = sub.thinkers && sub.thinkers.length ? `<div class="section-subtitle">Key Thinkers</div>` + 
          sub.thinkers.map(tk => `<span class="thinker-tag">${tk}</span>`).join("") : "";

        let questionsHtml = "";
        if (sub.questions && sub.questions.length) {
          questionsHtml = `<div class="section-subtitle">Past Exam Questions (${sub.questions.length})</div>` +
            sub.questions.map((q, idx) => {
              const qKey = `${sub.id}_q${idx}`;
              const qStat = appState.questionStatuses[qKey] || "unattempted";
              return `
                <div class="question-item">
                  <div class="question-meta">
                    <span><strong>${q.year}</strong> • ${q.type}</span>
                    <select onchange="updateQuestionStatus('${qKey}', this.value)" style="font-size:0.75rem; padding:2px;">
                      <option value="unattempted" ${qStat==='unattempted'?'selected':''}>Not Started</option>
                      <option value="planned" ${qStat==='planned'?'selected':''}>Essay Planned</option>
                      <option value="completed" ${qStat==='completed'?'selected':''}>Essay Written</option>
                    </select>
                  </div>
                  <div>"${q.prompt}"</div>
                </div>`;
            }).join("");
        }

        subHtml += `
          <div class="subsection-card">
            <div class="subsection-header">
              <span class="subsection-name">${sub.name}</span>
              <span id="badge_sub_${sub.id}">${getStatusBadgeHtml(subStat)}</span>
            </div>
            <button class="drawer-toggle" onclick="toggleDrawer('${sub.id}_drawer')">Granular Spec & Questions (${(sub.questions || []).length}) ▼</button>
            <div id="${sub.id}_drawer" class="drawer-content">
              ${bulletsHtml}
              ${thinkersHtml}
              ${questionsHtml}
            </div>
          </div>`;
      });

      paperHtml += `
        <div class="module-block">
          <div class="module-title">
            <span>${mod.title}</span>
            <span id="badge_mod_${mod.id}">${getStatusBadgeHtml(modStat)}</span>
          </div>
          ${subHtml}
        </div>`;
    });

    paperEl.innerHTML = paperHtml;
    container.appendChild(paperEl);
  });

  updateProgress();
}

function toggleDrawer(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle("open");
}

function updateBulletStatus(bulletId, subId, modId, paperId, val) {
  appState.bulletStatuses[bulletId] = parseInt(val, 10);
  saveState();

  const sel = document.getElementById(`select_${bulletId}`);
  if (sel) {
    sel.className = `status-select status-${val}`;
  }

  let targetSub = null, targetMod = null, targetPaper = null;

  SPEC_DATA.papers.forEach(p => {
    if (p.paperId === paperId) {
      targetPaper = p;
      p.modules.forEach(m => {
        if (m.id === modId) {
          targetMod = m;
          m.subsections.forEach(s => {
            if (s.id === subId) targetSub = s;
          });
        }
      });
    }
  });

  if (targetSub) {
    const newSubStat = getSubsectionStatus(targetSub);
    const subBadge = document.getElementById(`badge_sub_${subId}`);
    if (subBadge) subBadge.innerHTML = getStatusBadgeHtml(newSubStat);
  }

  if (targetMod) {
    const newModStat = getModuleStatus(targetMod);
    const modBadge = document.getElementById(`badge_mod_${modId}`);
    if (modBadge) modBadge.innerHTML = getStatusBadgeHtml(newModStat);
  }

  if (targetPaper) {
    const newPaperStat = getPaperStatus(targetPaper);
    const paperBadge = document.getElementById(`badge_${paperId}`);
    if (paperBadge) paperBadge.innerHTML = getStatusBadgeHtml(newPaperStat);
  }
}

function updateQuestionStatus(qKey, val) {
  appState.questionStatuses[qKey] = val;
  saveState();
}

function updateProgress() {
  let totalBullets = 0;
  let score = 0;

  SPEC_DATA.papers.forEach(p => {
    p.modules.forEach(m => {
      m.subsections.forEach(s => {
        s.bullets.forEach(b => {
          totalBullets += 3;
          score += (appState.bulletStatuses[b.id] || 0);
        });
      });
    });
  });

  const pct = totalBullets > 0 ? Math.round((score / totalBullets) * 100) : 0;
  document.getElementById("overallPercentage").innerText = `${pct}%`;
  document.getElementById("overallBar").style.width = `${pct}%`;
}

// --- EVENT LISTENERS ---
document.getElementById("themeToggle").addEventListener("click", () => {
  appState.theme = appState.theme === "light" ? "dark" : "light";
  saveState();
  document.body.classList.toggle("light-mode", appState.theme === "light");
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `politics_tracker_backup_v2_${new Date().toISOString().slice(0,10)}.json`);
  dlAnchor.click();
});

document.getElementById("importBtn").addEventListener("click", () => {
  document.getElementById("importFile").click();
});

document.getElementById("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      appState = JSON.parse(evt.target.result);
      saveState();
      loadState();
      render();
      alert("Progress successfully imported into Version 2.0!");
    } catch (err) {
      alert("Invalid JSON file format.");
    }
  };
  reader.readAsText(file);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW reg error:', err));
  });
}

loadState();
render();
