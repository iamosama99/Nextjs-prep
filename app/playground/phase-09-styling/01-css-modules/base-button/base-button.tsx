import styles from "./base-button.module.css";

export function BaseButton() {
  return (
    <button className={styles.primary} data-testid="base-button">
      Base Button (blue)
    </button>
  );
}
