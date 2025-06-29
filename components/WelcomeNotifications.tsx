import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Platform
} from 'react-native';
import { Bell, MapPin, X, Check } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { useNotificationsStore } from '@/store/notificationsStore';
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
    completeFirstTimeSetup 
  } = useNotificationsStore();
  
  const [step, setStep] = useState(1);
  const [selectedRegions, setSelectedRegions] = useState<number[]>([]);
  const [isSettingUp, setIsSettingUp] = useState(false);
  
  const regions = preferences.filter(pref => pref.type === 'region');
  const popularRegions = regions.filter(region => 
    ['Trójmiasto', 'Kraj', 'Kartuzy', 'Wejherowo'].includes(region.name)
  );
  
  const handleRegionToggle = (regionId: number) => {
    setSelectedRegions(prev => 
      prev.includes(regionId) 
        ? prev.filter(id => id !== regionId)
        : [...prev, regionId]
    );
  };
  
  const handleFinishSetup = async () => {
    setIsSettingUp(true);
    
    try {
      // Request notification permissions
      const hasPermission = await notificationService.requestPermissions();
      
      if (hasPermission) {
        // Enable notifications
        toggleNotifications();
        
        // Update selected regions
        selectedRegions.forEach(regionId => {
          updatePreference(regionId, true);
        });
        
        // Enable some default categories
        const defaultCategories = preferences.filter(pref => 
          pref.type === 'category' && 
          ['Wiadomości', 'Kultura i Rozrywka'].includes(pref.name)
        );
        defaultCategories.forEach(cat => {
          updatePreference(cat.id, true);
        });
      }
      
      // Mark first time setup as complete
      completeFirstTimeSetup();
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error setting up notifications:', error);
    } finally {
      setIsSettingUp(false);
    }
  };
  
  const handleSkip = () => {
    completeFirstTimeSetup();
    onClose();
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleSkip}
          >
            <X size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <View style={styles.progressContainer}>
            <View style={[
              styles.progressDot, 
              { backgroundColor: step >= 1 ? theme.colors.primary : theme.colors.border }
            ]} />
            <View style={[
              styles.progressLine, 
              { backgroundColor: step >= 2 ? theme.colors.primary : theme.colors.border }
            ]} />
            <View style={[
              styles.progressDot, 
              { backgroundColor: step >= 2 ? theme.colors.primary : theme.colors.border }
            ]} />
          </View>
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {step === 1 ? (
            // Step 1: Welcome
            <View style={styles.stepContainer}>
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
                Bądź na bieżąco z Kaszubami!
              </Text>
              
              <Text style={[
                styles.subtitle,
                { 
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fontFamily.regular
                }
              ]}>
                Otrzymuj powiadomienia o najważniejszych wydarzeniach z Twojego regionu. 
                Możesz to zmienić w każdej chwili w ustawieniach.
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
              </View>
            </View>
          ) : (
            // Step 2: Region Selection
            <View style={styles.stepContainer}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.subtle }]}>
                <MapPin size={48} color={theme.colors.primary} />
              </View>
              
              <Text style={[
                styles.title,
                { 
                  color: theme.colors.text,
                  fontFamily: theme.fontFamily.bold
                }
              ]}>
                Wybierz swoje regiony
              </Text>
              
              <Text style={[
                styles.subtitle,
                { 
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fontFamily.regular
                }
              ]}>
                Zaznacz regiony, z których chcesz otrzymywać powiadomienia o najważniejszych wydarzeniach.
              </Text>
              
              {/* Popular Regions */}
              <View style={styles.regionsSection}>
                <Text style={[
                  styles.sectionTitle,
                  { 
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.semibold
                  }
                ]}>
                  Popularne regiony
                </Text>
                
                <View style={styles.regionsGrid}>
                  {popularRegions.map((region) => (
                    <TouchableOpacity
                      key={region.id}
                      style={[
                        styles.regionCard,
                        { 
                          backgroundColor: selectedRegions.includes(region.id) 
                            ? theme.colors.primary 
                            : theme.colors.card,
                          borderColor: selectedRegions.includes(region.id)
                            ? theme.colors.primary
                            : theme.colors.border
                        }
                      ]}
                      onPress={() => handleRegionToggle(region.id)}
                    >
                      <Text style={[
                        styles.regionName,
                        { 
                          color: selectedRegions.includes(region.id) 
                            ? '#FFFFFF' 
                            : theme.colors.text,
                          fontFamily: theme.fontFamily.medium
                        }
                      ]}>
                        {region.name}
                      </Text>
                      {selectedRegions.includes(region.id) && (
                        <Check size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* All Regions */}
              <View style={styles.regionsSection}>
                <Text style={[
                  styles.sectionTitle,
                  { 
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.semibold
                  }
                ]}>
                  Wszystkie regiony
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
              </View>
            </View>
          )}
        </ScrollView>
        
        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: theme.colors.card }]}>
          {step === 1 ? (
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
                  Może później
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setStep(2)}
              >
                <Text style={[
                  styles.nextButtonText,
                  { fontFamily: theme.fontFamily.semibold }
                ]}>
                  Dalej
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
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
                  Pomiń
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.nextButton, 
                  { 
                    backgroundColor: selectedRegions.length > 0 
                      ? theme.colors.primary 
                      : theme.colors.border,
                    opacity: isSettingUp ? 0.7 : 1
                  }
                ]}
                onPress={handleFinishSetup}
                disabled={selectedRegions.length === 0 || isSettingUp}
              >
                <Text style={[
                  styles.nextButtonText,
                  { 
                    color: selectedRegions.length > 0 ? '#FFFFFF' : theme.colors.textSecondary,
                    fontFamily: theme.fontFamily.semibold
                  }
                ]}>
                  {isSettingUp ? 'Konfigurowanie...' : 'Gotowe!'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  regionsSection: {
    width: '100%',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  regionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  regionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    minWidth: '45%',
  },
  regionName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  regionsList: {
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