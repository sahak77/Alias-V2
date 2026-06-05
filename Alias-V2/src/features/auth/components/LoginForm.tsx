import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { theme, useTheme } from '@/theme';
import { useLogin } from '../api/useLogin';
import { loginSchema, type LoginInput } from '../schemas';

export function LoginForm() {
  const { theme: active } = useTheme();
  const login = useLogin();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => login.mutate(values));

  return (
    <View style={styles.container}>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.field}>
            <Text variant="label">Email</Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: active.colors.border, color: active.colors.text },
              ]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="you@example.com"
              placeholderTextColor={active.colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              accessibilityLabel="Email"
            />
            {errors.email ? (
              <Text variant="caption" color="danger">
                {errors.email.message}
              </Text>
            ) : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.field}>
            <Text variant="label">Password</Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: active.colors.border, color: active.colors.text },
              ]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="••••••••"
              placeholderTextColor={active.colors.textMuted}
              secureTextEntry
              autoComplete="password"
              accessibilityLabel="Password"
            />
            {errors.password ? (
              <Text variant="caption" color="danger">
                {errors.password.message}
              </Text>
            ) : null}
          </View>
        )}
      />

      {login.isError ? (
        <Text variant="caption" color="danger">
          Could not sign in. Check your credentials and try again.
        </Text>
      ) : null}

      <Button title="Sign in" onPress={onSubmit} loading={isSubmitting || login.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  field: {
    gap: theme.spacing.xs,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radii.md,
    fontSize: theme.typography.body.fontSize,
  },
});
