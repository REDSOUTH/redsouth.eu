import { Check, Circle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { validatePasswordStrength } from "@/lib/userProfile";

interface PasswordChecklistProps {
  password: string;
}

export function PasswordChecklist({ password }: PasswordChecklistProps) {
  const { t } = useTranslation();
  const check = validatePasswordStrength(password);

  const rules = [
    { ok: check.minLength, label: t("auth.pw_rule_length", "At least 8 characters") },
    { ok: check.hasUpper, label: t("auth.pw_rule_upper", "One uppercase letter (A-Z)") },
    { ok: check.hasLower, label: t("auth.pw_rule_lower", "One lowercase letter (a-z)") },
    { ok: check.hasNumber, label: t("auth.pw_rule_number", "One number (0-9)") },
    { ok: check.hasSpecial, label: t("auth.pw_rule_special", "One special character (!@#$...)") },
  ];

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 text-xs">
      {rules.map((rule) => (
        <li
          key={rule.label}
          className={`flex items-center gap-1.5 transition-colors ${
            rule.ok ? "text-emerald-500 font-medium" : "text-muted-foreground"
          }`}
        >
          {rule.ok ? (
            <Check className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <Circle className="h-3 w-3 shrink-0 opacity-50" />
          )}
          <span>{rule.label}</span>
        </li>
      ))}
    </ul>
  );
}
