import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import {
  Trophy,
  Flame,
  Target,
  Droplet,
  Camera,
  Scale,
  Award,
  CheckCircle2,
  Lock,
  X,
} from 'lucide-react-native';
import { MilestoneBadge } from '@/types/nutrition';
import { PALETTE, FONTS } from '@/constants/theme';
import { triggerLightImpact, triggerSelection } from '@/services/hapticsService';

interface MilestoneBadgesProps {
  badges: MilestoneBadge[];
}

export function MilestoneBadges({ badges }: MilestoneBadgesProps) {
  const [selectedBadge, setSelectedBadge] = useState<MilestoneBadge | null>(null);

  const getBadgeIcon = (iconName: string, isUnlocked: boolean, color: string) => {
    const size = 18;
    switch (iconName) {
      case 'flame':
        return <Flame size={size} color={isUnlocked ? '#EA580C' : PALETTE[400]} fill={isUnlocked ? '#EA580C' : 'transparent'} />;
      case 'trophy':
        return <Trophy size={size} color={isUnlocked ? '#D97706' : PALETTE[400]} fill={isUnlocked ? '#D97706' : 'transparent'} />;
      case 'target':
        return <Target size={size} color={isUnlocked ? '#059669' : PALETTE[400]} />;
      case 'droplet':
        return <Droplet size={size} color={isUnlocked ? '#0284C7' : PALETTE[400]} fill={isUnlocked ? '#0284C7' : 'transparent'} />;
      case 'camera':
        return <Camera size={size} color={isUnlocked ? PALETTE[950] : PALETTE[400]} />;
      case 'scale':
        return <Scale size={size} color={isUnlocked ? '#7C3AED' : PALETTE[400]} />;
      default:
        return <Award size={size} color={isUnlocked ? PALETTE[950] : PALETTE[400]} />;
    }
  };

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Milestone Badges</Text>
          <Text style={styles.subtitle}>
            {unlockedCount} of {badges.length} unlocked • Track consistency & goals
          </Text>
        </View>
        <View style={styles.trophyCountBadge}>
          <Trophy size={12} color={PALETTE[700]} />
          <Text style={styles.trophyCountText}>{unlockedCount}/{badges.length}</Text>
        </View>
      </View>

      <View style={styles.badgeGrid}>
        {badges.map((badge) => (
          <TouchableOpacity
            key={badge.id}
            style={[styles.badgeCard, badge.isUnlocked && styles.badgeCardUnlocked]}
            onPress={() => {
              triggerLightImpact();
              setSelectedBadge(badge);
            }}
            activeOpacity={0.8}>
            <View style={[styles.badgeIconWrapper, badge.isUnlocked ? styles.badgeIconUnlocked : styles.badgeIconLocked]}>
              {getBadgeIcon(badge.icon, badge.isUnlocked, PALETTE[950])}
              {!badge.isUnlocked && (
                <View style={styles.lockOverlay}>
                  <Lock size={9} color={PALETTE[400]} />
                </View>
              )}
            </View>

            <Text style={styles.badgeTitle} numberOfLines={1}>
              {badge.title}
            </Text>

            {/* Mini Progress Track */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(badge.progress * 100)}%` },
                  badge.isUnlocked && styles.progressFillUnlocked,
                ]}
              />
            </View>

            <Text style={styles.progressText}>{badge.progressText}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Badge Detail Modal */}
      <Modal
        visible={!!selectedBadge}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedBadge(null)}>
          <View style={styles.modalCard}>
            {selectedBadge && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconBox, selectedBadge.isUnlocked ? styles.badgeIconUnlocked : styles.badgeIconLocked]}>
                    {getBadgeIcon(selectedBadge.icon, selectedBadge.isUnlocked, PALETTE[950])}
                  </View>
                  <TouchableOpacity onPress={() => setSelectedBadge(null)} style={styles.closeBtn}>
                    <X size={16} color={PALETTE[600]} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalBadgeTitle}>{selectedBadge.title}</Text>
                <Text style={styles.modalBadgeDesc}>{selectedBadge.description}</Text>

                <View style={styles.modalStatusRow}>
                  {selectedBadge.isUnlocked ? (
                    <View style={styles.unlockedTag}>
                      <CheckCircle2 size={13} color="#059669" />
                      <Text style={styles.unlockedTagText}>Milestone Achieved</Text>
                    </View>
                  ) : (
                    <View style={styles.lockedTag}>
                      <Lock size={12} color={PALETTE[600]} />
                      <Text style={styles.lockedTagText}>In Progress ({selectedBadge.progressText})</Text>
                    </View>
                  )}
                </View>

                {/* Progress bar in modal */}
                <View style={styles.modalProgressTrack}>
                  <View
                    style={[
                      styles.modalProgressFill,
                      { width: `${Math.round(selectedBadge.progress * 100)}%` },
                      selectedBadge.isUnlocked && styles.progressFillUnlocked,
                    ]}
                  />
                </View>
                <Text style={styles.modalProgressSub}>
                  {Math.round(selectedBadge.progress * 100)}% Completed
                </Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontFamily: FONTS.serif,
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE[950],
  },
  subtitle: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: PALETTE[600],
    marginTop: 1,
  },
  trophyCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PALETTE[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trophyCountText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[700],
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeCard: {
    width: '31%',
    backgroundColor: PALETTE[50],
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PALETTE[100],
  },
  badgeCardUnlocked: {
    backgroundColor: '#F8FCFB',
    borderColor: PALETTE[200],
  },
  badgeIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  badgeIconUnlocked: {
    backgroundColor: PALETTE[100],
  },
  badgeIconLocked: {
    backgroundColor: PALETTE[100],
    opacity: 0.6,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: PALETTE.white,
    borderRadius: 6,
    padding: 2,
  },
  badgeTitle: {
    fontFamily: FONTS.serif,
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE[950],
    textAlign: 'center',
    marginBottom: 4,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: PALETTE[100],
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: PALETTE[400],
    borderRadius: 2,
  },
  progressFillUnlocked: {
    backgroundColor: '#059669',
  },
  progressText: {
    fontFamily: FONTS.sans,
    fontSize: 8,
    color: PALETTE[500],
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 33, 35, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: PALETTE.white,
    borderRadius: 18,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PALETTE[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBadgeTitle: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE[950],
    marginBottom: 4,
  },
  modalBadgeDesc: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: PALETTE[600],
    lineHeight: 17,
    marginBottom: 12,
  },
  modalStatusRow: {
    marginBottom: 12,
  },
  unlockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  unlockedTagText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  lockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PALETTE[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  lockedTagText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE[700],
  },
  modalProgressTrack: {
    height: 6,
    backgroundColor: PALETTE[100],
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  modalProgressFill: {
    height: '100%',
    backgroundColor: PALETTE[600],
    borderRadius: 3,
  },
  modalProgressSub: {
    fontFamily: FONTS.sans,
    fontSize: 10,
    color: PALETTE[500],
    textAlign: 'right',
  },
});
