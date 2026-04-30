import { memo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  type ChangelogRelease,
  CHANGELOG_IN_APP,
} from "@/constants/changelog-in-app";
import { Colors } from "@/constants/theme";

function BulletList({
  items,
  colors,
}: {
  items: string[];
  colors: (typeof Colors)["light"];
}) {
  return (
    <View style={styles.bullets}>
      {items.map((line, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={[styles.bulletGlyph, { color: colors.subtext }]}>•</Text>
          <Text style={[styles.bulletText, { color: colors.text }]}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

function ReleaseBlock({
  release,
  colors,
}: {
  release: ChangelogRelease;
  colors: (typeof Colors)["light"];
}) {
  const meta = [
    release.date,
    release.androidVersionCode != null
      ? `Android versionCode ${release.androidVersionCode}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={[styles.releaseCard, { borderColor: colors.border }]}>
      <Text style={[styles.releaseTitle, { color: colors.text }]}>
        Version {release.version}
      </Text>
      <Text style={[styles.releaseMeta, { color: colors.subtext }]}>{meta}</Text>

      <Subsection title="Added" items={release.added} colors={colors} />
      {release.fixed?.length ? (
        <Subsection title="Fixed" items={release.fixed} colors={colors} />
      ) : null}
      {release.changed?.length ? (
        <Subsection title="Changed" items={release.changed} colors={colors} />
      ) : null}
    </View>
  );
}

function Subsection({
  title,
  items,
  colors,
}: {
  title: string;
  items: string[];
  colors: (typeof Colors)["light"];
}) {
  return (
    <View style={styles.subsection}>
      <Text style={[styles.subsectionLabel, { color: colors.subtext }]}>
        {title}
      </Text>
      <BulletList items={items} colors={colors} />
    </View>
  );
}

export const ChangelogPanel = memo(function ChangelogPanel({
  colors,
}: {
  colors: (typeof Colors)["light"];
}) {
  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Text style={[styles.intro, { color: colors.subtext }]}>
          Recent updates from the app changelog, newest first.
        </Text>
        {CHANGELOG_IN_APP.map((release) => (
          <ReleaseBlock key={release.version} release={release} colors={colors} />
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  intro: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  releaseCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  releaseTitle: { fontSize: 17, fontWeight: "700" },
  releaseMeta: { fontSize: 12, marginTop: 2, marginBottom: 12 },
  subsection: { marginBottom: 12 },
  subsectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  bullets: { gap: 8 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  bulletGlyph: { fontSize: 14, lineHeight: 20, marginTop: 1 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
