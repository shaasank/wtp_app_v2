import { Link } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, Linking } from 'react-native';

type ExternalLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & { href: string };

export function ExternalLink({ href, ...props }: ExternalLinkProps) {
  return (
    <Link
      target="_blank"
      {...props}
      href={href as any}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          // Prevent the default browser behavior on native.
          e.preventDefault();
          // Open the link with the system browser.
          Linking.openURL(href).catch((err) =>
            console.warn('Could not open URL:', err)
          );
        }
      }}
    />
  );
}
