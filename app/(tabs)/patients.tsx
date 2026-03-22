import { useLensStorage } from '@/context/LensStorageContext';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { ContactLensDetails } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function PatientsScreen() {
  const { records, deleteRecord, refresh, error } = useLensStorage();
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  const handleDelete = (item: ContactLensDetails) => {
    Alert.alert(
      'Delete record',
      `Delete lens record for ${item.patientName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecord(item.id);
            } catch {
              Alert.alert('Error', 'Could not delete. Is the server running?');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ContactLensDetails }) => (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.patientName, { color: c.text }]}>{item.patientName}</Text>
        <Pressable onPress={() => handleDelete(item)} hitSlop={12}>
          <FontAwesome name="trash-o" size={20} color={c.placeholder} />
        </Pressable>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: c.placeholder }]}>HVID</Text>
        <Text style={[styles.value, { color: c.text }]}>{item.hvid || '–'} mm</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: c.placeholder }]}>DIA</Text>
        <Text style={[styles.value, { color: c.text }]}>{item.diameter || '–'} mm</Text>
      </View>
      {inferFittingTypeFromHvidAndDia(item.hvid, item.diameter) ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: c.placeholder }]}>Fitting</Text>
          <Text style={[styles.value, { color: c.text }]}>
            {inferFittingTypeFromHvidAndDia(item.hvid, item.diameter)}
          </Text>
        </View>
      ) : null}
      <View style={styles.row}>
        <Text style={[styles.label, { color: c.placeholder }]}>BC</Text>
        <Text style={[styles.value, { color: c.text }]}>{item.baseCurve || '–'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: c.placeholder }]}>Rx</Text>
        <Text style={[styles.value, { color: c.primary, fontWeight: '600' }]}>
          {item.sphere ?? item.power} D
          {item.cylinder ? ` / ${item.cylinder} @ ${item.axis ?? ''}` : ''}
        </Text>
      </View>
      {(item.lensType === 'tint' || item.lensType === 'colored') && item.lensColor ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: c.placeholder }]}>Lens</Text>
          <Text style={[styles.value, { color: c.text }]}>
            {item.lensType === 'tint' ? 'Tint' : 'Colored'} – {item.lensColor}
          </Text>
        </View>
      ) : null}
      {item.spectaclePower ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: c.placeholder }]}>From spectacle</Text>
          <Text style={[styles.value, { color: c.text }]}>{item.spectaclePower} D</Text>
        </View>
      ) : null}
      {item.notes ? (
        <Text style={[styles.notes, { color: c.placeholder }]} numberOfLines={2}>{item.notes}</Text>
      ) : null}
      {item.savedAt ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: c.placeholder }]}>Saved</Text>
          <Text style={[styles.value, { color: c.text }]}>{new Date(item.savedAt).toLocaleString()}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: '#fef2f2' }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {records.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.placeholder }]}>No lens records yet.</Text>
          <Text style={[styles.emptySub, { color: c.placeholder }]}>Add details from the Lens Details tab.</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={false}
          onRefresh={refresh}
        />
      )}
    </View>
  );
}

function inferFittingTypeFromHvidAndDia(hvid: string | undefined, diameter: string | undefined) {
  const h = hvid ? parseFloat(hvid.replace(',', '.')) : NaN;
  const d = diameter ? parseFloat(diameter.replace(',', '.')) : NaN;
  if (!Number.isFinite(h) || !Number.isFinite(d)) return null;

  // We stored diameter with `toFixed(1)`, so small float differences are possible.
  const epsilon = 0.25;
  if (Math.abs(d - (h + 2)) <= epsilon) return 'Soft';
  if (Math.abs(d - (h - 2)) <= epsilon) return 'Hard';
  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorBanner: {
    margin: 12,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
  },
  list: { padding: 20, paddingBottom: 40 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientName: {
    fontSize: 17,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: { fontSize: 13 },
  value: { fontSize: 14 },
  notes: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: { fontSize: 16 },
  emptySub: { fontSize: 14, marginTop: 8 },
});
