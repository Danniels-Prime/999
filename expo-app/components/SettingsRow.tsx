import {
  View,
  Text,
  Switch,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../constants/theme';

// ── Toggle row ────────────────────────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}

export function ToggleRow({ label, description, value, onToggle }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.labelBlock}>
        <Text style={styles.label}>{label}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: Colors.accentDim }}
        thumbColor={value ? Colors.accent : Colors.textMuted}
      />
    </View>
  );
}

// ── Secret input row ────────────────────────────────────────────────────────────────

interface SecretRowProps {
  label: string;
  description?: string;
  value: string;
  placeholder: string;
  onChangeText: (v: string) => void;
}

export function SecretRow({
  label,
  description,
  value,
  placeholder,
  onChangeText,
}: SecretRowProps) {
  return (
    <View style={styles.secretBlock}>
      <Text style={styles.label}>{label}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      <TextInput
        style={styles.secretInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        secureTextEntry
        autoCorrect={false}
        autoCapitalize="none"
      />
    </View>
  );
}

// ── Section header ──────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  labelBlock: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  description: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  secretBlock: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  secretInput: {
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  sectionHeader: {
    fontFamily: FontFamily.monoBold,
    fontSize: FontSize.xs,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
});
