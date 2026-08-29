import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  Animated,
  Alert
} from 'react-native';
import { Bell, MapPin, X, Check, Info, Shield, Wifi, Globe } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { useNotificationsStore, availableLocations, UserLocation } from '@/store/notificationsStore';
import { notificationService } from '@/services/notificationService';

const { height } = Dimensions.get('window');

interface WelcomeNotificationsProps {
  visible: boolean;
  onClose: () => void;
}

const WelcomeNotifications: React.FC<WelcomeNotificationsProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useThemeStore();
  const { 
    preferences, 
    updatePreference, 
    toggleNotifications,
    completeFirstTimeSetup,
    setUserLocation
  } = useNotificationsStore();
  
  const [step, setStep] = useState(1); // 1: intro, 2: regions, 3: categories, 4: summary
  const [selectedLocation, setSelectedLocation] = useState<UserLocation | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [animationValue] = useState(new Animated.Value(0));
  
  const regions = useMemo(() => preferences.filter(pref => pref.type === 'region'), [preferences]);
  const categories = useMemo(() => preferences.filter(pref => pref.type === 'category'), [preferences]);
  
  // Preselect all categories initially
  useEffect(() => {
    if (categories.length > 0 && selectedCategories.length === 0) {
      setSelectedCategories(categories.map(c => c.id));
    }
  }, [categories, selectedCategories.length]);

  useEffect(() => {
    if (visible) {
      Animated.timing(animationValue, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animationValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, animationValue]);
  
  const handleLocationSelect = (location: UserLocation) => {
    setSelectedLocation(location);
  };
  
  const handleRegionToggle = (regionId: number) => {
    setSelectedRegions(prev => {
      const isSelected = prev.includes(regionId);
      const next = isSelected ? prev.filter(id => id !== regionId) : [...prev, regionId];

      // Keep primary location in sync (first selected region becomes primary)
      if (!isSelected && !selectedLocation) {
        const found = availableLocations.find(l => l.id === regionId);
        if (found) setSelectedLocation(found);
      } else if (isSelected && selectedLocation?.id === regionId) {
        const nextPrimaryId = next[0];
        const found = availableLocations.find(l => l.id === nextPrimaryId);
        setSelectedLocation(found || null);
      }

      return next;
    });
  };
  
  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };
  
  const handleFinishSetup = async () => {
    setIsSettingUp(true);
    
    try {
      // Set user location
      if (selectedLocation) {
        setUserLocation(selectedLocation);
      }
      
      // Request notification permissions
      const hasPermission = await notificationService.requestPermissions();
      
      if (hasPermission) {
        // Enable notifications
        toggleNotifications();
        
        // Register for push notifications
        await notificationService.registerForPushNotifications();
        
        // Update selected regions
        selectedRegions.forEach(regionId => {
          updatePreference(regionId, true);
        });
        
        // Update selected categories
        selectedCategories.forEach(categoryId => {
          updatePreference(categoryId, true);
        });
      } else {
        Alert.alert(
          'Brak uprawnień',
          'Możesz włączyć powiadomienia później w Ustawieniach aplikacji.',
          [{ text: 'OK' }]
        );
      }
      
      // Mark first time setup as complete
      completeFirstTimeSetup();
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error setting up Expo Push notifications:', error);
      Alert.alert(
        'Błąd konfiguracji',
        'Wystąpił problem z konfiguracją powiadomień. Możesz spróbować ponownie w Ustawieniach.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSettingUp(false);
    }
  };
  
  const handleSkip = () => {
    completeFirstTimeSetup();
    onClose();
  };
  
  const handleNextStep = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handlePreviousStep = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 4) {
      setStep(3);
    }
  };
  
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
            opacity: animationValue
          }
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleSkip}
          >
            <X size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <View style={styles.progressContainer}>
            {[1, 2, 3, 4].map((stepNumber) => (
              <View key={stepNumber} style={styles.progressItem}>
                <View style={[
                  styles.progressDot, 
                  { backgroundColor: step >= stepNumber ? theme.colors.primary : theme.colors.border }
                ]} />
                {stepNumber < 4 && (
                  <View style={[
                    styles.progressLine, 
                    { backgroundColor: step > stepNumber ? theme.colors.primary : theme.colors.border }
                  ]} />
                )}
              </View>
            ))}
          </View>
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {step === 1 ? (
            // Step 1: Welcome
            <Animated.View 
              style={[
                styles.stepContainer,
                {
                  transform: [{
                    translateY: animationValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    })
                  }]
                }
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.subtle }]}>
                <Bell size={48} color={theme.colors.primary} />
              </View>
              
              <Text style={[
                styles.title,
                { 
                  color: theme.colors.text,
                  fontFamily: theme.fontFamily.bold
                }
              ]}>
                Bądź zawsze poinformowany!
              </Text>
              
              <Text style={[
                styles.subtitle,
                { 
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fontFamily.regular
                }
              ]}>
                Otrzymuj powiadomienia o najważniejszych wydarzeniach z Twojego regionu. 
                System poprosi Cię o zgodę na powiadomienia (domyślny komunikat iOS/Android). 
                Zawsze możesz to zmienić w Ustawieniach.
              </Text>
              
              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Check size={20} color={theme.colors.success} />
                  <Text style={[
                    styles.benefitText,
                    { 
                      color: theme.colors.text,
                      fontFamily: theme.fontFamily.medium
                    }
                  ]}>
                    Najświeższe wiadomości z Kaszub
                  </Text>
                </View>
                
                <View style={styles.benefitItem}>
                  <Check size={20} color={theme.colors.success} />
                  <Text style={[
                    styles.benefitText,
                    { 
                      color: theme.colors.text,
                      fontFamily: theme.fontFamily.medium
                    }
                  ]}>
                    Wybierz tylko to, co Cię interesuje
                  </Text>
                </View>
                
                <View style={styles.benefitItem}>
                  <Check size={20} color={theme.colors.success} />
                  <Text style={[
                    styles.benefitText,
                    { 
                      color: theme.colors.text,
                      fontFamily: theme.fontFamily.medium
                    }
                  ]}>
                    Możesz wyłączyć w każdej chwili
                  </Text>
                </View>

                <View style={styles.benefitItem}>
                  <Shield size={20} color={theme.colors.success} />
                  <Text style={[
                    styles.benefitText,
                    { 
                      color: theme.colors.text,
                      fontFamily: theme.fontFamily.medium
                    }
                  ]}>
                    Twoje dane są bezpieczne
                  </Text>
                </View>
              </View>
            </Animated.View>
          ) : step === 2 ? (
            // Step 2: Region selection
            <Animated.View 
              style={[
                styles.stepContainer,
                {
                  transform: [{
                    translateY: animationValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    })
                  }]
                }
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.subtle }]}>
                <MapPin size={48} color={theme.colors.primary} />
              </View>
              
              <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fontFamily.bold }]}>
                Wybierz regiony
              </Text>
              
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
                Wybierz regiony, które Cię interesują. Pierwszy wybrany region będzie Twoją główną lokalizacją.
              </Text>
              
              <View style={styles.regionsList}>
                {regions.map((region) => (
                  <TouchableOpacity
                    key={region.id}
                    style={[
                      styles.regionListItem,
                      { 
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border
                      }
                    ]}
                    onPress={() => handleRegionToggle(region.id)}
                  >
                    <Text style={[
                      styles.regionListName,
                      { 
                        color: theme.colors.text,
                        fontFamily: theme.fontFamily.medium
                      }
                    ]}>
                      {region.name}
                    </Text>
                    <View style={[
                      styles.checkbox,
                      { 
                        backgroundColor: selectedRegions.includes(region.id) 
                          ? theme.colors.primary 
                          : 'transparent',
                        borderColor: selectedRegions.includes(region.id)
                          ? theme.colors.primary
                          : theme.colors.border
                      }
                    ]}>
                      {selectedRegions.includes(region.id) && (
                        <Check size={14} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          ) : step === 3 ? (
            // Step 3: Categories selection
            <Animated.View 
              style={[
                styles.stepContainer,
                {
                  transform: [{
                    translateY: animationValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    })
                  }]
                }
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.subtle }]}>
                <Bell size={48} color={theme.colors.primary} />
              </View>
              
              <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fontFamily.bold }]}>
                Wybierz działy tematyczne
              </Text>
              
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
                Wszystkie działy są domyślnie zaznaczone. Możesz odznaczyć te, które Cię nie interesują.
              </Text>
              
              <View style={styles.regionsList}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.regionListItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    onPress={() => handleCategoryToggle(cat.id)}
                  >
                    <Text style={[styles.regionListName, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
                      {cat.name === 'Wiadomości' ? 'Wszystkie' : cat.name}
                    </Text>
                    <View style={[styles.checkbox, { backgroundColor: selectedCategories.includes(cat.id) ? theme.colors.primary : 'transparent', borderColor: selectedCategories.includes(cat.id) ? theme.colors.primary : theme.colors.border }]}>
                      {selectedCategories.includes(cat.id) && (
                        <Check size={14} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          ) : step === 4 ? (
            // Step 4: Summary
            <Animated.View 
              style={[
                styles.stepContainer,
                {
                  transform: [{
                    translateY: animationValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    })
                  }]
                }
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.subtle }]}>
                <Globe size={48} color={theme.colors.primary} />
              </View>
              
              <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fontFamily.bold }]}>
                Podsumowanie
              </Text>
              
              <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                  <MapPin size={20} color={theme.colors.primary} />
                  <Text style={[styles.summaryText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
                    Regiony: {selectedRegions.length} wybranych
                  </Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <Bell size={20} color={theme.colors.primary} />
                  <Text style={[styles.summaryText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
                    Kategorie: {selectedCategories.length} wybranych
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <Info size={20} color={theme.colors.primary} />
                  <Text style={[styles.summaryText, { color: theme.colors.text, fontFamily: theme.fontFamily.medium }]}>
                    Powiadomienia: {selectedRegions.length > 0 && selectedCategories.length > 0 ? 'Włączone' : 'Wyłączone'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular, marginTop: 20 }]}>
                Możesz zmienić te ustawienia w każdej chwili w zakładce Ustawienia.
              </Text>
            </Animated.View>
          ) : null}
        </ScrollView>
        
        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: theme.colors.card }]}>
          <View style={styles.footerButtons}>
            <TouchableOpacity 
              style={[styles.skipButton, { backgroundColor: theme.colors.subtle }]}
              onPress={handleSkip}
            >
              <Text style={[
                styles.skipButtonText,
                { 
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fontFamily.medium
                }
              ]}>
                {step === 4 ? 'Pomiń' : 'Może później'}
              </Text>
            </TouchableOpacity>

            {step > 1 && (
              <TouchableOpacity 
                style={[styles.previousButton, { backgroundColor: theme.colors.subtle }]}
                onPress={handlePreviousStep}
              >
                <Text style={[
                  styles.previousButtonText,
                  { 
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fontFamily.medium
                  }
                ]}>
                  Wstecz
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.nextButton, { backgroundColor: (step === 1 || step === 2 || step === 3 || step === 4) ? theme.colors.primary : theme.colors.border, opacity: isSettingUp ? 0.7 : 1 }]}
              onPress={step === 4 ? handleFinishSetup : handleNextStep}
              disabled={isSettingUp || (step === 2 && selectedRegions.length === 0)}
            >
              <Text style={[
                styles.nextButtonText,
                { color: (step === 1 || step === 2 || step === 3 || step === 4) ? '#FFFFFF' : theme.colors.textSecondary, fontFamily: theme.fontFamily.semibold }
              ]}>
                {isSettingUp ? 'Konfigurowanie...' : (step === 4 ? 'Włącz powiadomienia' : 'Dalej')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
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
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  benefitsList: {
    width: '100%',
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 16,
    flex: 1,
  },
  regionsList: {
    width: '100%',
    gap: 8,
  },
  regionListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  regionListName: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 20,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
  },
  summaryText: {
    fontSize: 16,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  footerButtons: {
    flexDirection: 'row',
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
    fontWeight: '500',
  },
  previousButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  previousButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WelcomeNotifications;