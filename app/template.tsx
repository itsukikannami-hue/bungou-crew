import type { ReactNode } from "react";
import styles from "./PageTransition.module.css";

/**
 * Next.js App Router re-mounts a template on navigation.
 * Keep this as a server component; no client-side routing interception is needed.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className={styles.enter}>{children}</div>;
}
