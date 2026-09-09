import { BaseButton } from "./base-button/base-button";
import styles from "./page.module.css";

export default function CssModulesPage() {
  return (
    <div>
      <h1>CSS Modules</h1>
      <p>
        Both buttons below use a class literally named <code>.primary</code> in their own{" "}
        <code>.module.css</code> file — one blue (from <code>base-button.module.css</code>), one red
        (from this page&apos;s own <code>page.module.css</code>). View source: the actual{" "}
        <code>className</code> attributes should be two entirely different generated names, not both
        <code>primary</code>, proving CSS Modules genuinely scope the class rather than relying on
        convention alone.
      </p>
      <BaseButton />
      <button className={styles.primary} data-testid="page-button">
        Page Button (red)
      </button>
    </div>
  );
}
