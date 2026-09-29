import { Platform } from 'react-native';
import { File, Directory, Paths } from 'expo-file-system';
import { newId } from './nutritionRules';
export async function persistMealPhoto(uri?: string): Promise<string | undefined> {
    if (!uri || uri.startsWith('https://') || uri.startsWith('data:'))
        return uri;
    if (Platform.OS === 'web') {
        const response = await fetch(uri);
        if (!response.ok)
            throw new Error('Unable to save the meal photo.');
        const blob = await response.blob();
        return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Unable to save the meal photo.')); reader.readAsDataURL(blob); });
    }
    const directory = new Directory(Paths.document, 'meal-photos');
    directory.create({ idempotent: true, intermediates: true });
    if (uri.startsWith(directory.uri))
        return uri;
    const source = new File(uri);
    const suffix = uri.split('?')[0].match(/\.(jpg|jpeg|png|webp)$/i)?.[0] ?? '.jpg';
    const destination = new File(directory, newId('photo') + suffix);
    source.copy(destination);
    return destination.uri;
}
