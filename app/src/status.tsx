import type { Status } from "@agelace/shared";

export const statusLabel: Record<Status, string> = {
  canon: "Canon",
  proposed: "Proposed",
  question: "Question",
};

// Lozenge for settled truth, hollow lozenge for trial, and the percontation
// point ⸮ — the 1580s mark for a question that expects no answer.
const MARK: Record<Status, string> = { canon: "◆", proposed: "◇", question: "⸮" };

export interface StatusMarkProps {
  status: Status;
}

export function StatusMark({ status }: StatusMarkProps) {
  return (
    <span className={`status-mark status-${status}`} aria-hidden="true">
      {MARK[status]}
    </span>
  );
}
