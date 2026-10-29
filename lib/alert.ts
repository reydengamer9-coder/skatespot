import { Alert, Platform } from 'react-native';

/** Alert que también funciona en web (Alert.alert de React Native no hace nada en el navegador). */
export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') window.alert(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}
