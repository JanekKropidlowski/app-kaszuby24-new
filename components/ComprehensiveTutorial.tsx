import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  ScrollView,
  Animated,
  PanResponder,
  Modal,
  Image,
  Platform,
  Vibration
} from 'react-native';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  X, 
  Home, 
  Search, 
  Calendar, 
  Settings, 
  User,
  MapPin,
  Bell,
  Star,
  Heart,
  Share,
  BookOpen,
  Clock,
  Users,
  Shield,
  Star as StarIcon,
  Heart as HeartIcon,
  Smile,
  Frown,
  Meh,
  Edit,
  Settings as SettingsIcon,
  Shield as ShieldIcon,
  AlertTriangle
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/store/themeStore';
import {
  Bookmark,
  BookmarkPlus,
  CloudRain,
  Download,
  Filter,
  Globe,
  RefreshCw,
  Sparkles,
  TrendingUp,
  MessageCircle,
  ThumbsUp,
  Wifi,
  WifiOff,
  Sun,
  Cloud,
  CloudLightning,
  Snowflake,
  Wind,
  Droplets,
  Thermometer,
  Compass,
  Navigation,
  Target,
  Pin,
  Map,
  Layers,
  BarChart3,
  PieChart,
  Activity,
  BellRing,
  BellOff,
  Volume1,
  Accessibility,
  EyeOff,
  Type,
  Contrast,
  Palette,
  Moon,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Move,
  Hand,
  MousePointer,
  Coffee,
  Fingerprint,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  UserCheck,
  UserPlus,
  Users2,
  UserX,
  UserMinus,
  UserCog,
} from 'lucide-react-native';

interface ComprehensiveTutorialProps {
  visible: boolean;
  onClose: () => void;
  initialStep?: number;
  onComplete?: () => void;
}

type TutorialStep = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  features: Array<{
    icon: any;
    title: string;
    description: string;
    interactive?: boolean;
    demoAction?: () => void;
  }>;
  tips?: string[];
  showDemo?: boolean;
  demoContent?: React.ReactNode;
  completionAction?: () => void;
  progressValue?: number;
};

export const ComprehensiveTutorial: React.FC<ComprehensiveTutorialProps> = ({
  visible,
  onClose,
  initialStep = 0,
  onComplete,
}) => {
  const { theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [animationValue] = useState(new Animated.Value(0));
  const [slideAnimation] = useState(new Animated.Value(0));
  const [progressAnimation] = useState(new Animated.Value(0));
  const [featureAnimations] = useState(() => 
    Array(20).fill(0).map(() => new Animated.Value(0))
  );
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [interactiveMode, setInteractiveMode] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const { width, height } = Dimensions.get('window');

  const tutorialSteps: TutorialStep[] = useMemo(() => [
    {
      id: 'welcome',
      title: 'Witamy w Kaszuby24',
      subtitle: 'Twoje źródło informacji o regionie',
      description: 'Poznaj wszystkie funkcje aplikacji. Każda funkcja została zaprojektowana z myślą o mieszkańcach Kaszub.',
      icon: Home,
      features: [
        {
          icon: BookOpen,
          title: 'Aktualności',
          description: 'Najnowsze wiadomości z regionu',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Simulate news opening
          },
        },
        {
          icon: Calendar,
          title: 'Wydarzenia',
          description: 'Kalendarz imprez i uroczystości',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Simulate calendar opening
          },
        },
        {
          icon: CloudRain,
          title: 'Pogoda',
          description: 'Aktualna pogoda i prognozy',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Simulate weather widget
          },
        },
      ],
      completionAction: () => {
        setCompletedSteps(prev => new Set([...prev, 'welcome']));
      },
    },
    {
      id: 'navigation',
      title: 'Nawigacja',
      subtitle: 'Jak poruszać się po aplikacji',
      description: 'Poznaj wszystkie zakładki i ich funkcje. Każda zakładka ma unikalne możliwości.',
      icon: Navigation,
      features: [
        {
          icon: Search,
          title: 'Wyszukiwanie',
          description: 'Znajdź konkretne artykuły i wydarzenia',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            setInteractiveMode(true);
            setTimeout(() => setInteractiveMode(false), 2000);
          },
        },
        {
          icon: Bookmark,
          title: 'Zapisane',
          description: 'Artykuły zapisane do czytania offline',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show bookmark animation
          },
        },
        {
          icon: Home,
          title: 'Główna',
          description: 'Strona główna z najnowszymi wiadomościami',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Navigate to home
          },
        },
        {
          icon: Calendar,
          title: 'Kalendarz',
          description: 'Wydarzenia i imprezy w regionie',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show calendar preview
          },
        },
        {
          icon: Settings,
          title: 'Ustawienia',
          description: 'Konfiguracja aplikacji i powiadomień',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show settings preview
          },
        },
      ],
      tips: [
        'Użyj gestów przesuwania, aby przełączać między zakładkami',
        'Każda zakładka ma unikalne funkcje i możliwości',
        'Zapisane artykuły są dostępne offline',
        'Sprawdź kalendarz dla lokalnych wydarzeń',
        'Dostosuj ustawienia w zakładce Ustawienia',
      ],
      completionAction: () => {
        setCompletedSteps(prev => new Set([...prev, 'navigation']));
      },
    },
    {
      id: 'articles',
      title: 'Czytanie artykułów',
      subtitle: 'Jak korzystać z treści',
      description: 'Poznaj funkcje dostępne podczas czytania artykułów. Każda funkcja ułatwia korzystanie z treści.',
      icon: BookOpen,
      features: [
        {
          icon: Heart,
          title: 'Zapisywanie',
          description: 'Dotknij serca, aby zapisać artykuł',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show heart animation
          },
        },
        {
          icon: Share,
          title: 'Udostępnianie',
          description: 'Podziel się artykułem ze znajomymi',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show share dialog
          },
        },
        {
          icon: Bookmark,
          title: 'Zapisane',
          description: 'Zapisane artykuły dostępne offline',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show saved articles
          },
        },
        {
          icon: BookOpen,
          title: 'Pasek postępu',
          description: 'Śledź swój postęp w czytaniu',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show progress bar animation
          },
        },
        {
          icon: Bell,
          title: 'Czytanie na głos',
          description: 'Słuchaj artykułów zamiast czytać',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show TTS animation
          },
        },
      ],
      tips: [
        'Szybko przesuwaj palcem, aby przewijać artykuł',
        'Dotknij dwukrotnie, aby powiększyć zdjęcia',
        'Użyj gestów, aby wrócić do listy artykułów',
        'Zapisane artykuły są dostępne offline',
        'Użyj trybu ciemnego dla lepszego czytania w nocy',
      ],
      completionAction: () => {
        setCompletedSteps(prev => new Set([...prev, 'articles']));
      },
    },
    {
      id: 'search',
      title: 'Wyszukiwanie',
      subtitle: 'Znajdź to, czego szukasz',
      description: 'Skorzystaj z zaawansowanych opcji wyszukiwania. Filtruj i znajdź dokładnie to, czego potrzebujesz.',
      icon: Search,
      features: [
        {
          icon: Filter,
          title: 'Filtry',
          description: 'Filtruj według kategorii i regionów',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show filter options
          },
        },
        {
          icon: Clock,
          title: 'Sortowanie',
          description: 'Sortuj według daty i popularności',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show sorting options
          },
        },
        {
          icon: MapPin,
          title: 'Regiony',
          description: 'Wyszukuj w konkretnych regionach',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show region selection
          },
        },
        {
          icon: TrendingUp,
          title: 'Kategorie',
          description: 'Filtruj według tematów',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show category selection
          },
        },
      ],
      tips: [
        'Użyj cudzysłowów dla dokładnego wyszukiwania',
        'Kombinuj słowa kluczowe dla lepszych wyników',
        'Zapisz ważne wyszukiwania w zakładce Zapisane',
        'Użyj filtrów, aby zawęzić wyniki',
        'Wybierz region dla lokalnych wiadomości',
      ],
      completionAction: () => {
        setCompletedSteps(prev => new Set([...prev, 'search']));
      },
    },
    {
      id: 'notifications',
      title: 'Powiadomienia',
      subtitle: 'Bądź na bieżąco',
      description: 'Skonfiguruj powiadomienia, aby nie przegapić ważnych informacji. Dostosuj je do swoich preferencji.',
      icon: BellRing,
      features: [
        {
          icon: MapPin,
          title: 'Regiony',
          description: 'Wybierz regiony, które Cię interesują',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show region selection
          },
        },
        {
          icon: Filter,
          title: 'Kategorie',
          description: 'Dostosuj tematy powiadomień',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show category selection
          },
        },
        {
          icon: BellOff,
          title: 'Wyłącz/Włącz',
          description: 'Kontroluj powiadomienia',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show notification toggle
          },
        },
        {
          icon: Settings,
          title: 'Ustawienia',
          description: 'Konfiguruj w zakładce Ustawienia',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show settings navigation
          },
        },
      ],
      tips: [
        'Możesz wyłączyć powiadomienia w każdej chwili',
        'Ustaw priorytetowe kategorie',
        'Wybierz regiony, które Cię interesują',
        'Sprawdź ustawienia w zakładce Ustawienia',
        'Powiadomienia są wysyłane automatycznie',
      ],
      completionAction: () => {
        setCompletedSteps(prev => new Set([...prev, 'notifications']));
      },
    },
    {
      id: 'weather',
      title: 'Pogoda',
      subtitle: 'Sprawdź aktualną pogodę',
      description: 'Dostęp do szczegółowych informacji meteorologicznych. Sprawdź prognozy i ostrzeżenia.',
      icon: CloudRain,
      features: [
        {
          icon: Clock,
          title: 'Prognozy',
          description: 'Pogoda na najbliższe dni',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show weather forecast
          },
        },
        {
          icon: MapPin,
          title: 'Lokalizacja',
          description: 'Pogoda dla Twojego regionu',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show location weather
          },
        },
        {
          icon: AlertTriangle,
          title: 'Ostrzeżenia',
          description: 'Alerty pogodowe',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show weather alerts
          },
        },
        {
          icon: Thermometer,
          title: 'Temperatura',
          description: 'Aktualna temperatura i odczucie',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show temperature details
          },
        },
        {
          icon: Wind,
          title: 'Jakość powietrza',
          description: 'Sprawdź jakość powietrza',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show air quality info
          },
        },
      ],
      tips: [
        'Sprawdź prognozy przed planowaniem wycieczek',
        'Ustaw powiadomienia o ostrzeżeniach pogodowych',
        'Sprawdź jakość powietrza w swoim regionie',
        'Użyj radaru opadów dla dokładnych informacji',
        'Sprawdź indeks UV przed wyjściem',
      ],
      completionAction: () => {
        setCompletedSteps(prev => new Set([...prev, 'weather']));
      },
    },
    {
      id: 'offline',
      title: 'Tryb offline',
      subtitle: 'Czytaj bez internetu',
      description: 'Korzystaj z aplikacji nawet bez połączenia z internetem. Zapisane artykuły są zawsze dostępne.',
      icon: WifiOff,
      features: [
        {
          icon: Bookmark,
          title: 'Zapisane artykuły',
          description: 'Dostępne offline',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show saved articles
          },
        },
        {
          icon: Download,
          title: 'Lista do czytania',
          description: 'Organizuj zapisane treści',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show reading list
          },
        },
        {
          icon: RefreshCw,
          title: 'Automatyczna synchronizacja',
          description: 'Dane synchronizują się przy połączeniu',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show sync info
          },
        },
        {
          icon: Wifi,
          title: 'Status połączenia',
          description: 'Sprawdź stan połączenia z internetem',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show connection status
          },
        },
      ],
      tips: [
        'Zapisuj artykuły, gdy masz internet',
        'Organizuj listę do czytania',
        'Dane synchronizują się automatycznie',
        'Sprawdź status połączenia w ustawieniach',
        'Zapisane artykuły są zawsze dostępne',
      ],
      completionAction: () => {
        setCompletedSteps(prev => new Set([...prev, 'offline']));
      },
    },
    {
      id: 'accessibility',
      title: 'Dostępność',
      subtitle: 'Aplikacja dla wszystkich',
      description: 'Funkcje ułatwiające korzystanie z aplikacji. Dostosuj aplikację do swoich potrzeb.',
      icon: Accessibility,
      features: [
        {
          icon: Volume1,
          title: 'Czytanie na głos',
          description: 'Słuchaj artykułów',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show TTS demo
          },
        },
        {
          icon: Palette,
          title: 'Motyw',
          description: 'Wybierz jasny lub ciemny motyw',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show theme options
          },
        },
        {
          icon: Hand,
          title: 'Gesty',
          description: 'Użyj gestów do nawigacji',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show gesture options
          },
        },
      ],
      tips: [
        'Użyj trybu ciemnego w słabym świetle',
        'Włącz czytanie na głos dla długich artykułów',
        'Użyj gestów dla łatwiejszej nawigacji',
        'Dostosuj ustawienia w zakładce Ustawienia',
      ],
      completionAction: () => {
        setCompletedSteps(prev => new Set([...prev, 'accessibility']));
      },
    },
    {
      id: 'tips',
      title: 'Przydatne wskazówki',
      subtitle: 'Jak lepiej korzystać z aplikacji',
      description: 'Poznaj funkcje, które ułatwią Ci korzystanie z aplikacji. Każda wskazówka to nowa możliwość.',
      icon: Sparkles,
      features: [
        {
          icon: Bookmark,
          title: 'Zapisywanie',
          description: 'Zapisuj ulubione artykuły',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show bookmark demo
          },
        },
        {
          icon: Share,
          title: 'Udostępnianie',
          description: 'Dziel się z rodziną i znajomymi',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show sharing demo
          },
        },
        {
          icon: Volume1,
          title: 'Czytanie na głos',
          description: 'Słuchaj artykułów zamiast czytać',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show TTS demo
          },
        },
        {
          icon: Coffee,
          title: 'Wsparcie',
          description: 'Wesprzyj naszą pracę',
          interactive: true,
          demoAction: () => {
            Vibration.vibrate(50);
            // Show support demo
          },
        },
      ],
      tips: [
        'Przesuwaj w dół, aby odświeżyć listę',
        'Użyj gestów do nawigacji',
        'Zapisuj ważne artykuły',
        'Korzystaj z trybu offline',
        'Dostosuj powiadomienia do swoich potrzeb',
        'Użyj wyszukiwania dla szybkiego dostępu',
        'Sprawdź pogodę przed wyjściem z domu',
        'Wesprzyj naszą pracę kupując kawę',
      ],
      completionAction: () => {
        setCompletedSteps(prev => new Set([...prev, 'tips']));
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      },
    },
  ], []);

  useEffect(() => {
    if (visible) {
      try {
        Animated.parallel([
          Animated.timing(animationValue, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(progressAnimation, {
            toValue: (currentStep + 1) / tutorialSteps.length,
            duration: 500,
            useNativeDriver: false,
          }),
        ]).start();

        // Animate features
        featureAnimations.forEach((anim, index) => {
          try {
            Animated.timing(anim, {
              toValue: 1,
              duration: 300,
              delay: index * 100,
              useNativeDriver: true,
            }).start();
          } catch (error) {
            console.warn('Error in feature animation:', error);
          }
        });
      } catch (error) {
        console.warn('Error in tutorial animation:', error);
      }
    } else {
      try {
        Animated.timing(animationValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        console.warn('Error in tutorial close animation:', error);
      }
    }
  }, [visible, currentStep, animationValue, slideAnimation, progressAnimation, featureAnimations]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      // Execute completion action for current step
      const currentStepData = tutorialSteps[currentStep];
      if (currentStepData.completionAction && typeof currentStepData.completionAction === 'function') {
        try {
          currentStepData.completionAction();
        } catch (error) {
          console.warn('Error in completionAction:', error);
        }
      }

      try {
        Animated.timing(slideAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setCurrentStep(currentStep + 1);
          Animated.timing(slideAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
        });
      } catch (error) {
        console.warn('Error in handleNext animation:', error);
        setCurrentStep(currentStep + 1);
      }
    } else {
      // Complete tutorial
      const currentStepData = tutorialSteps[currentStep];
      if (currentStepData.completionAction && typeof currentStepData.completionAction === 'function') {
        try {
          currentStepData.completionAction();
        } catch (error) {
          console.warn('Error in completionAction:', error);
        }
      }
      if (onComplete && typeof onComplete === 'function') {
        try {
          onComplete();
        } catch (error) {
          console.warn('Error in onComplete callback:', error);
        }
      }
              if (onClose && typeof onClose === 'function') {
          try {
            onClose();
          } catch (error) {
            console.warn('Error in onClose callback:', error);
          }
        }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      try {
        Animated.timing(slideAnimation, {
          toValue: -1,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setCurrentStep(currentStep - 1);
          Animated.timing(slideAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
        });
      } catch (error) {
        console.warn('Error in handlePrevious animation:', error);
        setCurrentStep(currentStep - 1);
      }
    }
  };

  const handleSkip = () => {
    if (onClose && typeof onClose === 'function') {
      try {
        onClose();
      } catch (error) {
        console.warn('Error in onClose callback:', error);
      }
    }
  };

  const handleFeaturePress = (feature: any, index: number) => {
    if (feature.interactive && feature.demoAction && typeof feature.demoAction === 'function') {
      try {
        feature.demoAction();
      } catch (error) {
        console.warn('Error in demoAction:', error);
      }
    }
  };

  if (!visible) return null;

  const currentStepData = tutorialSteps[currentStep];
  const IconComponent = currentStepData.icon;
  const progressPercentage = ((currentStep + 1) / tutorialSteps.length) * 100;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            opacity: animationValue,
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity style={styles.closeButton} onPress={handleSkip}>
            <X size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.colors.primary,
                    width: progressAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
              {Math.round(progressPercentage)}% ukończone
            </Text>
          </View>

          <View style={styles.progressContainer}>
            {tutorialSteps.map((_, index) => (
              <View key={index} style={styles.progressItem}>
                <View
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor: index <= currentStep ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                />
                {index < tutorialSteps.length - 1 && (
                  <View
                    style={[
                      styles.progressLine,
                      {
                        backgroundColor: index < currentStep ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  />
                )}
              </View>
            ))}
          </View>

          <Text style={[styles.stepCounter, { color: theme.colors.textSecondary }]}>
            {currentStep + 1} z {tutorialSteps.length}
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              styles.stepContainer,
              {
                transform: [
                  {
                    translateX: slideAnimation.interpolate({
                      inputRange: [-1, 0, 1],
                      outputRange: [-width, 0, width],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Icon with animation */}
            <Animated.View 
              style={[
                styles.iconContainer, 
                { 
                  backgroundColor: theme.colors.subtle,
                  transform: [
                    {
                      scale: animationValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                    {
                      rotate: animationValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <IconComponent size={48} color={theme.colors.primary} />
            </Animated.View>

            {/* Title */}
            <Text
              style={[
                styles.title,
                { color: theme.colors.text, fontFamily: theme.fontFamily.bold },
              ]}
            >
              {currentStepData.title}
            </Text>

            {/* Subtitle */}
            <Text
              style={[
                styles.subtitle,
                { color: theme.colors.primary, fontFamily: theme.fontFamily.semibold },
              ]}
            >
              {currentStepData.subtitle}
            </Text>

            {/* Description */}
            <Text
              style={[
                styles.description,
                { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular },
              ]}
            >
              {currentStepData.description}
            </Text>

            {/* Features */}
            <View style={styles.featuresContainer}>
              {currentStepData.features.map((feature, index) => {
                const FeatureIcon = feature.icon;
                return (
                  <Animated.View 
                    key={index} 
                    style={[
                      styles.featureItem, 
                      { 
                        backgroundColor: theme.colors.card,
                        transform: [
                          {
                            translateY: featureAnimations[index].interpolate({
                              inputRange: [0, 1],
                              outputRange: [50, 0],
                            }),
                          },
                          {
                            scale: featureAnimations[index].interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.9, 1],
                            }),
                          },
                        ],
                        opacity: featureAnimations[index],
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.featureTouchable}
                      onPress={() => handleFeaturePress(feature, index)}
                      activeOpacity={feature.interactive ? 0.7 : 1}
                    >
                      <View style={[styles.featureIcon, { backgroundColor: theme.colors.subtle }]}>
                        <FeatureIcon size={20} color={theme.colors.primary} />
                      </View>
                      <View style={styles.featureContent}>
                        <Text
                          style={[
                            styles.featureTitle,
                            { color: theme.colors.text, fontFamily: theme.fontFamily.medium },
                          ]}
                        >
                          {feature.title}
                        </Text>
                        <Text
                          style={[
                            styles.featureDescription,
                            { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular },
                          ]}
                        >
                          {feature.description}
                        </Text>
                      </View>
                      
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>

            {/* Tips */}
            {currentStepData.tips && currentStepData.tips.length > 0 && (
              <Animated.View 
                style={[
                  styles.tipsContainer,
                  {
                    transform: [
                      {
                        translateY: animationValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      },
                    ],
                    opacity: animationValue,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tipsTitle,
                    { color: theme.colors.text, fontFamily: theme.fontFamily.semibold },
                  ]}
                >
                  💡 Wskazówki
                </Text>
                {currentStepData.tips.map((tip, index) => (
                  <View key={index} style={styles.tipItem}>
                    <Text
                      style={[
                        styles.tipText,
                        { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular },
                      ]}
                    >
                      • {tip}
                    </Text>
                  </View>
                ))}
              </Animated.View>
            )}

            {/* Interactive Mode Indicator */}
            {interactiveMode && (
              <Animated.View 
                style={[
                  styles.interactiveModeIndicator,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text style={styles.interactiveModeText}>Tryb interaktywny aktywny</Text>
              </Animated.View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: theme.colors.card }]}>
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={[styles.skipButton, { backgroundColor: theme.colors.subtle }]}
              onPress={handleSkip}
            >
              <Text
                style={[
                  styles.skipButtonText,
                  { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.medium },
                ]}
              >
                Pomiń
              </Text>
            </TouchableOpacity>

            {currentStep > 0 && (
              <TouchableOpacity
                style={[styles.previousButton, { backgroundColor: theme.colors.subtle }]}
                onPress={handlePrevious}
              >
                <ArrowLeft size={20} color={theme.colors.textSecondary} />
                <Text
                  style={[
                    styles.previousButtonText,
                    { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.medium },
                  ]}
                >
                  Wstecz
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleNext}
            >
              <Text
                style={[
                  styles.nextButtonText,
                  { color: '#FFFFFF', fontFamily: theme.fontFamily.semibold },
                ]}
              >
                {currentStep === tutorialSteps.length - 1 ? 'Zaczynamy!' : 'Dalej'}
              </Text>
              {currentStep < tutorialSteps.length - 1 && (
                <ArrowRight size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Celebration Animation */}
        {showCelebration && (
          <Animated.View style={styles.celebrationContainer}>
            <Text style={styles.celebrationText}>🎉 Gratulacje! 🎉</Text>
            <Text style={styles.celebrationSubtext}>Ukończyłeś samouczek!</Text>
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 20,
    right: 20,
    padding: 8,
    zIndex: 10,
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressLine: {
    width: 20,
    height: 2,
    marginHorizontal: 4,
  },
  stepCounter: {
    fontSize: 12,
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  featuresContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  featureTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  
  tipsContainer: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  tipItem: {
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  interactiveModeIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  interactiveModeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins_Medium',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
  },
  previousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  previousButtonText: {
    fontSize: 16,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 16,
  },
  celebrationContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -50 }],
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  celebrationText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Poppins_Bold',
    textAlign: 'center',
  },
  celebrationSubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins_Regular',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default ComprehensiveTutorial;
