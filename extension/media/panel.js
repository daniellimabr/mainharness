/* global acquireVsCodeApi, document, window */
// Webview script: renders the view-model with textContent only (no innerHTML, no user text as markup).
(function () {
  const vscode = acquireVsCodeApi();
  const app = document.getElementById("app");
  let vm = null;
  let sel = (vscode.getState() || {}).sel || null;

  function h(tag, cls, text, attrs) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    return e;
  }
  const kpi = (l, v, s) => {
    const k = h("div", "kpi");
    k.append(h("div", "l", l), h("div", "v num", v), h("div", "s", s));
    return k;
  };
  const pill = (text, cls) => h("span", "pill " + cls, text);
  const STATUS = {
    "a fazer": "p-todo",
    "em andamento": "p-run",
    "em revisão": "p-rev",
    feita: "p-done",
    reprovada: "p-fail",
  };
  const ROLE = { "tech-lead": "tech lead", clone: "clone", reviewer: "reviewer" };
  const noData = (t) => (t === "sem dado" ? "mute" : "");

  function table(head, rows, right) {
    const t = h("table");
    const tr = h("tr");
    head.forEach((x, i) => tr.append(h("th", right.includes(i) ? "r" : "", x)));
    t.append(tr);
    rows.forEach((r) => t.append(r));
    const wrap = h("div", "scroll");
    wrap.append(t);
    return wrap;
  }
  function row(cells, cls) {
    const tr = h("tr", cls || "");
    cells.forEach((c) => {
      const td = h("td", c.cls || "");
      if (c.node) td.append(c.node);
      else td.textContent = c.t;
      tr.append(td);
    });
    return tr;
  }
  function card(title, body) {
    const c = h("section", "card");
    c.append(h("h3", "", title), body);
    return c;
  }

  function chart(days) {
    if (!days.length) return h("p", "mute", "sem dado");
    const box = h("div", "bars", undefined, { role: "img", "aria-label": "Gasto por dia" });
    days.forEach((d) => {
      const col = h("div", "col", undefined, { title: d.day + ": " + d.usd });
      const bar = h("i");
      bar.style.height = Math.max(d.pct, 2) + "%";
      col.append(bar, h("span", "x", d.day));
      box.append(col);
    });
    return box;
  }

  function render() {
    app.textContent = "";
    if (!vm) return;
    if (!vm.projects.length) {
      app.append(h("p", "mute", "Nenhum projeto com harness registrado (sem dado)."));
      return;
    }
    const p = vm.projects.find((x) => x.id === sel) || vm.projects[0];
    sel = p.id;
    const live = vm.projects.filter((x) => x.status === "ativo").length;

    const kpis = h("div", "kpis");
    kpis.append(
      kpi("Gasto total", vm.total, "todos os projetos"),
      kpi("Projetos", String(vm.projects.length), live + " ativos"),
      kpi("Agentes ativos", String(vm.activeAgents), "agora"),
    );

    const list = h("div");
    vm.projects.forEach((x) => {
      const b = h("button", "proj", undefined, { "aria-pressed": String(x.id === sel) });
      const top = h("b");
      top.append(h("span", "", x.name), h("span", "num " + noData(x.usd), x.usd));
      const sub = h("small");
      sub.append(
        h("span", "live " + (x.status === "ativo" ? "" : "idle"), x.status),
        h("span", "", "último: " + x.last),
      );
      b.append(top, sub);
      b.addEventListener("click", () => {
        sel = x.id;
        vscode.setState({ sel });
        render();
      });
      list.append(b);
    });

    const right = h("div", "right");
    if (p.note) right.append(h("p", "mute", p.note));
    right.append(
      card(
        "Sprints de " + p.name,
        p.sprints.length
          ? table(
              ["Sprint", "Situação", "Tarefas", "Custo", "US$"],
              p.sprints
                .slice()
                .reverse()
                .map((s) => {
                  const bar = h("div", "bar");
                  const i = h("i");
                  i.style.width = s.pct + "%";
                  bar.append(i);
                  return row(
                    [
                      { t: s.id, cls: "mono" },
                      { t: s.status },
                      { t: s.progress, cls: "r num" },
                      { node: bar },
                      { t: s.usd, cls: "r num " + noData(s.usd) },
                    ],
                    s.active ? "sel" : "",
                  );
                }),
              [2, 4],
            )
          : h("p", "mute", "sem dado"),
      ),
      card(
        p.sprintActive === "sem dado" ? "Tarefas" : "Tarefas da " + p.sprintActive,
        p.tasks.length
          ? table(
              ["#", "Tarefa", "Agente", "Papel", "Status", "US$"],
              p.tasks.map((t) =>
                row([
                  { t: t.id, cls: "mono" },
                  { t: t.title, cls: noData(t.title) },
                  { t: t.agent, cls: noData(t.agent) },
                  { t: ROLE[t.role] || t.role },
                  { node: pill(t.status, STATUS[t.status] || "p-todo") },
                  { t: t.usd, cls: "r num " + noData(t.usd) },
                ]),
              ),
              [5],
            )
          : h("p", "mute", "Nenhuma sprint ativa neste projeto."),
      ),
    );
    const ag = h("div");
    if (!p.agents.length) ag.append(h("p", "mute", "Nenhum agente ativo neste projeto."));
    p.agents.forEach((a) => {
      const r = h("div", "agent");
      r.append(
        h("span", "", (ROLE[a.role] || a.role) + " na tarefa " + a.task),
        h("span", "live", "ativo"),
      );
      ag.append(r);
    });
    right.append(card("Agentes ativos agora", ag), card("Gasto por dia (US$, UTC)", chart(p.days)));

    const cols = h("div", "cols");
    cols.append(card("Projetos com harness", list), right);
    app.append(kpis, cols);
  }

  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "state") {
      vm = e.data.vm;
      render();
    }
  });
  vscode.postMessage({ type: "ready" });
})();
