import Modal from './Modal';

/* Small yes/no dialog used before irreversible actions (ship, cancel, return…) */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Go back</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>{message}</p>
    </Modal>
  );
}
