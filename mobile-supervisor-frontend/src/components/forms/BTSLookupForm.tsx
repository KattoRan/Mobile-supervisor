import { useState } from "react";
import styles from "./BTSLookupForm.module.css";

export type LookupRequest = {
  mcc: string;
  mnc: string;
  lacTac: string;
  cellId: string;
  earfcn?: string;
  pci?: string;
};

type Props = {
  onSubmit?: (payload: LookupRequest) => void;
};

export default function BTSLookupForm({ onSubmit }: Props) {
  const [form, setForm] = useState<LookupRequest>({
    mcc: "",
    mnc: "",
    lacTac: "",
    cellId: "",
    earfcn: "",
    pci: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (key: keyof LookupRequest, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const isDigits = (v: string) => /^\d+$/.test(v);

    if (!form.mcc) nextErrors.mcc = "Bắt buộc";
    else if (!isDigits(form.mcc)) nextErrors.mcc = "Chỉ cho phép số";

    if (!form.mnc) nextErrors.mnc = "Bắt buộc";
    else if (!isDigits(form.mnc)) nextErrors.mnc = "Chỉ cho phép số";

    if (!form.lacTac) nextErrors.lacTac = "Bắt buộc";
    else if (!isDigits(form.lacTac)) nextErrors.lacTac = "Chỉ cho phép số";

    if (!form.cellId) nextErrors.cellId = "Bắt buộc";
    else if (!isDigits(form.cellId)) nextErrors.cellId = "Chỉ cho phép số";

    if (form.earfcn && !isDigits(form.earfcn))
      nextErrors.earfcn = "Chỉ cho phép số";
    if (form.pci && !isDigits(form.pci)) nextErrors.pci = "Chỉ cho phép số";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: LookupRequest = {
      mcc: form.mcc.trim(),
      mnc: form.mnc.trim(),
      lacTac: form.lacTac.trim(),
      cellId: form.cellId.trim(),
    };
    if (form.earfcn) payload.earfcn = form.earfcn.trim();
    if (form.pci) payload.pci = form.pci.trim();

    if (onSubmit) onSubmit(payload);
    else console.log("[BTSLookupForm] submit payload:", payload);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="mcc">
            MCC
          </label>
          <input
            id="mcc"
            className={styles.input}
            inputMode="numeric"
            value={form.mcc}
            onChange={(e) => updateField("mcc", e.target.value)}
            placeholder="Ví dụ: 452"
          />
          {errors.mcc && <div className={styles.error}>{errors.mcc}</div>}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="mnc">
            MNC
          </label>
          <input
            id="mnc"
            className={styles.input}
            inputMode="numeric"
            value={form.mnc}
            onChange={(e) => updateField("mnc", e.target.value)}
            placeholder="Ví dụ: 04"
          />
          {errors.mnc && <div className={styles.error}>{errors.mnc}</div>}
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="lacTac">
            LAC/TAC
          </label>
          <input
            id="lacTac"
            className={styles.input}
            inputMode="numeric"
            value={form.lacTac}
            onChange={(e) => updateField("lacTac", e.target.value)}
            placeholder="Ví dụ: 12345"
          />
          {errors.lacTac && <div className={styles.error}>{errors.lacTac}</div>}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="cellId">
            CellID
          </label>
          <input
            id="cellId"
            className={styles.input}
            inputMode="numeric"
            value={form.cellId}
            onChange={(e) => updateField("cellId", e.target.value)}
            placeholder="Ví dụ: 67890"
          />
          {errors.cellId && <div className={styles.error}>{errors.cellId}</div>}
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="earfcn">
            EARFCN (tùy chọn)
          </label>
          <input
            id="earfcn"
            className={styles.input}
            inputMode="numeric"
            value={form.earfcn}
            onChange={(e) => updateField("earfcn", e.target.value)}
            placeholder="Ví dụ: 1800"
          />
          {errors.earfcn && <div className={styles.error}>{errors.earfcn}</div>}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="pci">
            PCI (tùy chọn)
          </label>
          <input
            id="pci"
            className={styles.input}
            inputMode="numeric"
            value={form.pci}
            onChange={(e) => updateField("pci", e.target.value)}
            placeholder="Ví dụ: 320"
          />
          {errors.pci && <div className={styles.error}>{errors.pci}</div>}
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.button} type="submit">
          Tra cứu
        </button>
      </div>
    </form>
  );
}
