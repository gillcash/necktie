// Editorial data stays separate from the repeated, accessible HTML structure.
const hosts = [
  ["codex", "Codex", "Codex", "Install from the marketplace, review and trust the hooks, then start a new task.", "codex plugin marketplace add gillcash/necktie\ncodex plugin add necktie@necktie"],
  ["claude", "Claude Code", "Claude Code", "Add the marketplace, then install the Necktie plugin.", "/plugin marketplace add gillcash/necktie\n/plugin install necktie@necktie"],
  ["copilot", "Copilot CLI", "GitHub Copilot CLI", "Install through Copilot’s plugin marketplace.", "copilot plugin marketplace add gillcash/necktie\ncopilot plugin install necktie@necktie"],
  ["gemini", "Gemini CLI", "Gemini CLI", "Install the extension directly from the public repository.", "gemini extensions install https://github.com/gillcash/necktie"],
  ["pi", "Pi", "Pi", "Install the repository as a Pi package.", "pi install git:github.com/gillcash/necktie"],
  ["opencode", "OpenCode", "OpenCode", "Add the published package to your OpenCode configuration.", "{ \"plugin\": [\"@gillcash/necktie\"] }"],
];
const questions = [
  ["Who benefits?", "Name the people who gain money, time, control, or optionality."],
  ["Who pays?", "Count the costs shifted onto workers, users, communities, and the future."],
  ["Who decides?", "Find the authority behind the metric, policy, price, or product choice."],
  ["Who can leave?", "Test whether consent is meaningful when exit is expensive or impossible."],
  ["What disappears from the metric?", "Recover the quality, care, risk, and hidden labor the dashboard cannot see."],
];
const escape = (value) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export function renderContent(html) {
  const install = hosts.map((host, index) => {
    const [id, label, title, description, command] = host.map(escape);
    return `<label><input id="host-${id}" name="host" type="radio"${index === 0 ? " checked" : ""}>${label}</label>
      <section class="install-panel" aria-labelledby="${id}-panel-title">
        <div>
          <p class="panel-count caption">0${index + 1} / 06</p>
          <h3 id="${id}-panel-title">${title}</h3>
          <p>${description}</p>
        </div>
        <pre><code>${command}</code></pre>
      </section>`;
  }).join("\n");
  const ledger = questions.map(([question, answer], index) => `<li>
    <span class="ledger-number">0${index + 1}</span>
    <h3>${escape(question)}</h3>
    <p>${escape(answer)}</p>
  </li>`).join("\n");
  return html.replace("{{INSTALL}}", install).replace("{{QUESTIONS}}", ledger);
}
