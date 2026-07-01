import type { ReactNode } from "react";

import "./updates.css";

export default function UpdatesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="updates-app">
      <div className="updates-workspace">{children}</div>
    </div>
  );
}
