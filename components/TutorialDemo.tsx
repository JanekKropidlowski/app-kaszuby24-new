import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { 
  HelpCircle, 
  Search, 
  BookOpen, 
  Bell, 
  Settings, 
  CloudRain,
  Wifi,
  Sparkles,
  Zap,
  Star,
  Heart,
  Share2,
  MessageCircle,
  ThumbsUp,
  ArrowRight,
  Play,
  Pause,
  Volume2,
  Eye,
  Download,
  Filter,
  Clock,
  TrendingUp,
  AlertTriangle,
  Thermometer,
  Droplets,
  RefreshCw,
  WifiOff,
  Accessibility,
  Type,
  Contrast,
  Palette,
  Hand,
  Navigation,
  Bookmark,
  Calendar,
  Home,
  MapPin,
  BellRing,
  BellOff,
} from 'lucide-react-native';
import ComprehensiveTutorial from './ComprehensiveTutorial';
import TutorialTrigger from './TutorialTrigger';
import OnboardingCoachmarks from './OnboardingCoachmarks';

export const TutorialDemo: React.FC = () => {
  const { theme } = useThemeStore();
  const [showComprehensiveTutorial, setShowComprehensiveTutorial] = useState(false);
  const [showCoachmarks, setShowCoachmarks] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const handleShowComprehensiveTutorial = () => {
    setShowComprehensiveTutorial(true);
  };

  const handleShowCoachmarks = () => {
    setShowCoachmarks(true);
  };

  const handleFeatureTutorial = (feature: string) => {
    setSelectedFeature(feature);
    setShowComprehensiveTutorial(true);
  };

  const handleTutorialClose = () => {
    setShowComprehensiveTutorial(false);
    setSelectedFeature(null);
  };

  const handleTutorialComplete = () => {
    setShowComprehensiveTutorial(false);
    setSelectedFeature(null);
    console.log('Tutorial completed!');
  };

  const handleCoachmarksComplete = () => {
    setShowCoachmarks(false);
    console.log('Coachmarks completed!');
  };

  const handleCoachmarksSkip = () => {
    setShowCoachmarks(false);
    console.log('Coachmarks skipped!');
  };

  const getFeatureStep = (feature: string): number => {
    switch (feature) {
      case 'search': return 3;
      case 'articles': return 2;
      case 'weather': return 5;
      case 'notifications': return 4;
      case 'settings': return 7;
      case 'offline': return 6;
      default: return 0;
    }
  };

  const features = [
    { id: 'search', name: 'Wyszukiwanie', icon: Search, color: '#3B82F6' },
    { id: 'articles', name: 'Artykuły', icon: BookOpen, color: '#10B981' },
    { id: 'weather', name: 'Pogoda', icon: CloudRain, color: '#F59E0B' },
    { id: 'notifications', name: 'Powiadomienia', icon: Bell, color: '#EF4444' },
    { id: 'settings', name: 'Ustawienia', icon: Settings, color: '#8B5CF6' },
    { id: 'offline', name: 'Tryb offline', icon: WifiOff, color: '#6B7280' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fontFamily.bold }]}>
          Demo Samouczka
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
          Przetestuj ulepszony system samouczka
        </Text>
      </View>

      {/* Main Tutorial Options */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
          Główne opcje samouczka
        </Text>
        
        <TouchableOpacity
          style={[styles.mainButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleShowComprehensiveTutorial}
        >
          <Sparkles size={24} color="#FFFFFF" />
          <Text style={[styles.mainButtonText, { color: '#FFFFFF', fontFamily: theme.fontFamily.semibold }]}>
            Pełny samouczek
          </Text>
          <ArrowRight size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          onPress={handleShowCoachmarks}
        >
          <Navigation size={24} color={theme.colors.primary} />
          <Text style={[styles.mainButtonText, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
            Onboarding z coachmarks
          </Text>
          <ArrowRight size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Feature-specific Tutorials */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
          Samouczki funkcji
        </Text>
        
        <View style={styles.featuresGrid}>
          {features.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <TouchableOpacity
                key={feature.id}
                style={[styles.featureCard, { backgroundColor: theme.colors.card }]}
                onPress={() => handleFeatureTutorial(feature.id)}
              >
                <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
                  <IconComponent size={24} color={feature.color} />
                </View>
                <Text style={[styles.featureName, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
                  {feature.name}
                </Text>
                <Text style={[styles.featureDescription, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
                  Kliknij, aby zobaczyć samouczek
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Interactive Features Demo */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
          Funkcje interaktywne
        </Text>
        
        <View style={styles.interactiveFeatures}>
          <TouchableOpacity
            style={[styles.interactiveButton, { backgroundColor: theme.colors.card }]}
            onPress={() => console.log('Heart pressed')}
          >
            <Heart size={20} color={theme.colors.primary} />
            <Text style={[styles.interactiveText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
              Zapisz artykuł
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.interactiveButton, { backgroundColor: theme.colors.card }]}
            onPress={() => console.log('Share pressed')}
          >
            <Share2 size={20} color={theme.colors.primary} />
            <Text style={[styles.interactiveText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
              Udostępnij
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.interactiveButton, { backgroundColor: theme.colors.card }]}
            onPress={() => console.log('Download pressed')}
          >
            <Download size={20} color={theme.colors.primary} />
            <Text style={[styles.interactiveText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
              Pobierz offline
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.interactiveButton, { backgroundColor: theme.colors.card }]}
            onPress={() => console.log('Volume pressed')}
          >
            <Volume2 size={20} color={theme.colors.primary} />
            <Text style={[styles.interactiveText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
              Czytaj na głos
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tutorial Triggers Demo */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.semibold }]}>
          Przykłady triggerów
        </Text>
        
        <View style={styles.triggersContainer}>
          <TutorialTrigger
            type="comprehensive"
            position="top-right"
            size="medium"
            showPulse={true}
          />
          
          <TutorialTrigger
            type="feature-specific"
            feature="search"
            position="bottom-right"
            size="large"
            showBadge={true}
            badgeCount={3}
          />
          
          <TutorialTrigger
            type="feature-specific"
            feature="articles"
            position="top-left"
            size="small"
            showPulse={true}
          />
        </View>
      </View>

      {/* Tutorial Components */}
      <ComprehensiveTutorial
        visible={showComprehensiveTutorial}
        onClose={handleTutorialClose}
        onComplete={handleTutorialComplete}
        initialStep={selectedFeature ? getFeatureStep(selectedFeature) : 0}
      />

      <OnboardingCoachmarks
        visible={showCoachmarks}
        onComplete={handleCoachmarksComplete}
        onSkip={handleCoachmarksSkip}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    gap: 12,
  },
  mainButtonText: {
    fontSize: 16,
    flex: 1,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureName: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  interactiveFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  interactiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 8,
    minWidth: '48%',
  },
  interactiveText: {
    fontSize: 14,
  },
  triggersContainer: {
    height: 200,
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    marginTop: 16,
  },
});

export default TutorialDemo;
