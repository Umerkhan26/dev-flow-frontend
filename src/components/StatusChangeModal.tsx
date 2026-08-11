import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { statusLabel } from "../types/engineering";

type StatusChangeModalProps = {
  open: boolean;
  issueKey: string;
  issueTitle: string;
  fromStatus: string;
  toStatus: string;
  saving?: boolean;
  requireNote?: boolean;
  onClose: () => void;
  onConfirm: (note: string) => Promise<void> | void;
};

export function StatusChangeModal({
  open,
  issueKey,
  issueTitle,
  fromStatus,
  toStatus,
  saving,
  requireNote,
  onClose,
  onConfirm,
}: StatusChangeModalProps) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNote("");
      setError(null);
    }
  }, [open, toStatus]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (requireNote && !note.trim()) {
      setError("Add a short note before marking this status.");
      return;
    }
    setError(null);
    await onConfirm(note.trim());
  }

  const isFinal = toStatus === "DONE" || toStatus === "CANCELLED";

  return (
    <Modal
      open={open}
      title="Update issue status"
      description="Confirm the move so teammates get a clear signal."
      onClose={onClose}
    >
      <form onSubmit={(e) => void onSubmit(e)}>
        <div className="stack">
          <div className="status-flow">
            <div>
              <span className="muted small">Issue</span>
              <strong>
                {issueKey} · {issueTitle}
              </strong>
            </div>
            <div className="status-flow-path">
              <span className={`status status-${fromStatus.toLowerCase()}`}>
                {statusLabel(fromStatus)}
              </span>
              <span className="muted">→</span>
              <span className={`status status-${toStatus.toLowerCase()}`}>
                {statusLabel(toStatus)}
              </span>
            </div>
          </div>

          <label>
            {isFinal || requireNote ? "Note (required for Done / Cancelled)" : "Note (optional)"}
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isFinal
                  ? "e.g. Merged PR #12, verified on staging"
                  : "e.g. Started implementation / ready for review"
              }
              required={Boolean(requireNote || isFinal)}
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
        </div>
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" disabled={saving}>
            {saving ? "Updating…" : `Move to ${statusLabel(toStatus)}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
