import Image from "next/image";

const githubUrl = "https://github.com/gillcash/necktie";

const questions = [
  {
    number: "01",
    question: "Who benefits?",
    answer: "Name the people who gain money, time, control, or optionality.",
  },
  {
    number: "02",
    question: "Who pays?",
    answer: "Count the costs shifted onto workers, users, communities, and the future.",
  },
  {
    number: "03",
    question: "Who decides?",
    answer: "Find the authority behind the metric, policy, price, or product choice.",
  },
  {
    number: "04",
    question: "Who can leave?",
    answer: "Test whether consent is meaningful when exit is expensive or impossible.",
  },
  {
    number: "05",
    question: "What disappears from the metric?",
    answer: "Recover the quality, care, risk, and hidden labor the dashboard cannot see.",
  },
];

const modes = [
  {
    name: "Lite",
    marker: "Focused",
    description:
      "A compact incentives-and-power check for routine work where the full treatment would add more ceremony than value.",
  },
  {
    name: "Full",
    marker: "Default",
    description:
      "The complete judgment: strongest extraction case, rebuttal, explicit position, and one useful action when it changes the outcome.",
  },
];

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="masthead">
        <a className="wordmark" href="#top" aria-label="Necktie home">
          Necktie
        </a>
        <nav aria-label="Primary navigation">
          <a href="#method">Method</a>
          <a href="#modes">Modes</a>
          <a href="#install">Install</a>
        </nav>
        <a className="github-link" href={githubUrl}>
          GitHub <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main id="main">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Agent policy · MIT licensed · v0.5.2</p>
            <h1 id="hero-title">
              He follows the money.
              <br />
              He finds the hidden cost.
              <br />
              <em>He takes a side.</em>
            </h1>
            <p className="hero-deck">
              Necktie is an opinionated policy for AI agents. It tests incentives,
              metrics, power, extraction, and who gets stuck with the bill—then
              gives you a usable judgment.
            </p>
            <div className="hero-actions" aria-label="Get started">
              <a className="button button-solid" href="#install">
                Install Necktie
              </a>
              <a className="button button-text" href="#method">
                See the method <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>

          <figure className="case-file">
            <div className="case-file-topline">
              <span>Exhibit A</span>
              <span>Witness / Investigator</span>
            </div>
            <div className="portrait-frame">
              <Image
                src="/necktie.png"
                width={955}
                height={955}
                alt="Necktie, a stern suited mascot with a long black tie"
                priority
                sizes="(max-width: 900px) 480px, 34vw"
              />
            </div>
            <figcaption>
              <span>An investigator for hidden costs</span>
              <span className="mode-stamp">Full mode · Default</span>
            </figcaption>
          </figure>
        </section>

        <section className="method" id="method" aria-labelledby="method-title">
          <div className="method-intro">
            <div className="section-label">
              <span>Method</span>
              <span>Five questions</span>
            </div>
            <p className="kicker">Follow the money</p>
            <h2 id="method-title">Ask what the dashboard leaves out.</h2>
            <p>
              Necktie treats metrics as evidence, never as truth. These questions
              expose the transfers and incentives hiding behind a clean number.
            </p>
          </div>

          <ol className="question-ledger">
            {questions.map((item) => (
              <li key={item.number}>
                <span className="ledger-number">{item.number}</span>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="evidence" aria-labelledby="evidence-title">
          <div>
            <p className="evidence-stamp">Evidence standard</p>
            <h2 id="evidence-title">Evidence, not a scoreboard.</h2>
          </div>
          <div className="evidence-copy">
            <p className="evidence-warning">No benchmark-performance claim yet.</p>
            <p>
              The public harness measures observable decision quality—not whether a
              model repeats the right political vocabulary. Prompts, fixtures,
              scoring, failures, and limits stay inspectable.
            </p>
            <a href={`${githubUrl}/blob/main/benchmarks/README.md`}>
              Inspect the benchmark contract <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        <section className="modes" id="modes" aria-labelledby="modes-title">
          <div className="section-label">
            <span>Operating modes</span>
            <span>Choose deliberately</span>
          </div>
          <div className="modes-heading">
            <p className="kicker">How hard should he look?</p>
            <h2 id="modes-title">Two lenses. One accountable user.</h2>
          </div>
          <div className="mode-grid">
            {modes.map((mode) => (
              <article className={`mode-card mode-${mode.name.toLowerCase()}`} key={mode.name}>
                <div className="mode-card-head">
                  <h3>{mode.name}</h3>
                  <span>{mode.marker}</span>
                </div>
                <p>{mode.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="boundaries" aria-labelledby="boundaries-title">
          <div className="boundaries-title">
            <p className="kicker">Trust &amp; boundaries</p>
            <h2 id="boundaries-title">Opinionated, not arbitrary.</h2>
            <p>
              Necktie can make the tradeoff visible. You retain authority over the
              legitimate value choice—and over every permission the agent receives.
            </p>
          </div>
          <div className="boundary-columns">
            <div>
              <h3>He does</h3>
              <ul>
                <li>Take a position when the evidence supports one</li>
                <li>Expose hidden costs, labor, and externalities</li>
                <li>Respect the user’s scope and decision authority</li>
                <li>Turn material judgment into one useful action</li>
              </ul>
            </div>
            <div>
              <h3>He does not</h3>
              <ul>
                <li>Invent ideological conflict for rhetorical effect</li>
                <li>Reveal private chain-of-thought or internal debate</li>
                <li>Expand permissions beyond the user’s request</li>
                <li>Treat a metric as the whole truth</li>
              </ul>
            </div>
          </div>
          <p className="mcp-note">
            <span>Optional private MCP</span> Read-only policy access. No arbitrary
            repository, file, execution, network, or mutation operation.
          </p>
        </section>

        <section className="install" id="install" aria-labelledby="install-title">
          <div className="install-heading">
            <div className="section-label light-label">
              <span>Install desk</span>
              <span>Six supported hosts</span>
            </div>
            <p className="kicker">Put him in the room</p>
            <h2 id="install-title">Install Necktie.</h2>
            <p>
              Node.js is required for hosts that run the lifecycle hook. Review
              third-party hooks before trusting them.
            </p>
          </div>

          <fieldset className="install-picker">
            <legend>Choose your host</legend>
            <input defaultChecked id="host-codex" name="host" type="radio" />
            <input id="host-claude" name="host" type="radio" />
            <input id="host-copilot" name="host" type="radio" />
            <input id="host-gemini" name="host" type="radio" />
            <input id="host-pi" name="host" type="radio" />
            <input id="host-opencode" name="host" type="radio" />

            <div className="install-labels" aria-label="Installation hosts">
              <label htmlFor="host-codex">Codex</label>
              <label htmlFor="host-claude">Claude Code</label>
              <label htmlFor="host-copilot">Copilot CLI</label>
              <label htmlFor="host-gemini">Gemini CLI</label>
              <label htmlFor="host-pi">Pi</label>
              <label htmlFor="host-opencode">OpenCode</label>
            </div>

            <div className="install-panels">
              <section className="install-panel panel-codex" aria-labelledby="codex-panel-title">
                <div>
                  <p className="panel-count">01 / 06</p>
                  <h3 id="codex-panel-title">Codex</h3>
                  <p>Install from the marketplace, review and trust the hooks, then start a new task.</p>
                </div>
                <pre><code>codex plugin marketplace add gillcash/necktie{"\n"}codex plugin add necktie@necktie</code></pre>
              </section>

              <section className="install-panel panel-claude" aria-labelledby="claude-panel-title">
                <div>
                  <p className="panel-count">02 / 06</p>
                  <h3 id="claude-panel-title">Claude Code</h3>
                  <p>Add the marketplace, then install the Necktie plugin.</p>
                </div>
                <pre><code>/plugin marketplace add gillcash/necktie{"\n"}/plugin install necktie@necktie</code></pre>
              </section>

              <section className="install-panel panel-copilot" aria-labelledby="copilot-panel-title">
                <div>
                  <p className="panel-count">03 / 06</p>
                  <h3 id="copilot-panel-title">GitHub Copilot CLI</h3>
                  <p>Install through Copilot’s plugin marketplace.</p>
                </div>
                <pre><code>copilot plugin marketplace add gillcash/necktie{"\n"}copilot plugin install necktie@necktie</code></pre>
              </section>

              <section className="install-panel panel-gemini" aria-labelledby="gemini-panel-title">
                <div>
                  <p className="panel-count">04 / 06</p>
                  <h3 id="gemini-panel-title">Gemini CLI</h3>
                  <p>Install the extension directly from the public repository.</p>
                </div>
                <pre><code>gemini extensions install https://github.com/gillcash/necktie</code></pre>
              </section>

              <section className="install-panel panel-pi" aria-labelledby="pi-panel-title">
                <div>
                  <p className="panel-count">05 / 06</p>
                  <h3 id="pi-panel-title">Pi</h3>
                  <p>Install the repository as a Pi package.</p>
                </div>
                <pre><code>pi install git:github.com/gillcash/necktie</code></pre>
              </section>

              <section className="install-panel panel-opencode" aria-labelledby="opencode-panel-title">
                <div>
                  <p className="panel-count">06 / 06</p>
                  <h3 id="opencode-panel-title">OpenCode</h3>
                  <p>Add the published package to your OpenCode configuration.</p>
                </div>
                <pre><code>{'{ "plugin": ["@gillcash/necktie"] }'}</code></pre>
              </section>
            </div>
          </fieldset>

          <div className="install-footer">
            <a className="button button-paper" href={`${githubUrl}#install`}>
              Read every install option <span aria-hidden="true">↗</span>
            </a>
            <p>Free software · MIT license · No analytics</p>
          </div>
        </section>
      </main>

      <footer>
        <div>
          <a className="wordmark" href="#top">Necktie</a>
          <p>Follow incentives. Find hidden costs. Take a side.</p>
        </div>
        <div className="footer-links">
          <a href={githubUrl}>GitHub</a>
          <a href={`${githubUrl}/blob/main/LICENSE`}>MIT license</a>
          <a href={`${githubUrl}/issues`}>Issues</a>
        </div>
        <p className="footer-proof">No benchmark-performance claim.</p>
      </footer>
    </>
  );
}
