import React, { useState, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Animated 
} from 'react-native';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown, ChevronUp, X } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

interface InlineCalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date | null) => void;
  events?: Array<{ date: string; count: number }>;
  startDate?: Date;
  endDate?: Date;
  onDateRangeSelect?: (startDate: Date, endDate: Date) => void;
}

const InlineCalendar: React.FC<InlineCalendarProps> = ({
  selectedDate,
  onDateSelect,
  events = [],
  startDate,
  endDate,
  onDateRangeSelect
}) => {
  const { theme } = useThemeStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const animatedScale = useRef(new Animated.Value(1)).current;

  // Ustaw zakres dat
  const effectiveStartDate = startDate || new Date();
  const effectiveEndDate = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 dni

  const months = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];

  const weekDays = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstDayOfWeek = firstDay.getDay() || 7; // Convert Sunday from 0 to 7

    const days = [];
    
    // Add empty days for padding
    for (let i = 1; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(year, month, i);
      days.push(dayDate);
    }
    
    return days;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    return date.getDate() === selectedDate?.getDate() && 
           date.getMonth() === selectedDate?.getMonth() && 
           date.getFullYear() === selectedDate?.getFullYear();
  };

  const isInRange = (date: Date) => {
    if (!rangeStart || !rangeEnd) return false;
    return date >= rangeStart && date <= rangeEnd;
  };

  const isRangeStart = (date: Date) => {
    return rangeStart && date.getTime() === rangeStart.getTime();
  };

  const isRangeEnd = (date: Date) => {
    return rangeEnd && date.getTime() === rangeEnd.getTime();
  };

  const isInValidRange = (date: Date) => {
    return date >= effectiveStartDate && date <= effectiveEndDate;
  };

  const hasEvents = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.some(event => event.date === dateStr);
  };

  const getEventCount = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const event = events.find(e => e.date === dateStr);
    return event?.count || 0;
  };

  // Helper function to get day styles
  const getDayStyles = (date: Date) => {
    const baseStyle = {
      backgroundColor: 'transparent',
      borderColor: theme.colors.border,
      color: theme.colors.text
    };

    if (isRangeStart(date) || isRangeEnd(date)) {
      return {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
        color: '#fff'
      };
    }

    if (isInRange(date)) {
      return {
        backgroundColor: theme.colors.primary + '40',
        borderColor: theme.colors.primary,
        color: theme.colors.primary
      };
    }

    if (isSelected(date)) {
      return {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
        color: '#fff'
      };
    }

    if (isToday(date)) {
      return {
        backgroundColor: theme.colors.subtle,
        borderColor: theme.colors.border,
        color: theme.colors.text
      };
    }

    return baseStyle;
  };

  const handleDatePress = (date: Date) => {
    Animated.sequence([
      Animated.timing(animatedScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Handle date range selection
    if (onDateRangeSelect) {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        // Start new range
        setRangeStart(date);
        setRangeEnd(null);
      } else {
        // Complete range
        const start = rangeStart < date ? rangeStart : date;
        const end = rangeStart < date ? date : rangeStart;
        setRangeStart(start);
        setRangeEnd(end);
        onDateRangeSelect(start, end);
      }
    } else {
      // Single date selection
      onDateSelect(date);
    }
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setRangeStart(null);
    setRangeEnd(null);
  };

  const clearSelection = () => {
    setRangeStart(null);
    setRangeEnd(null);
    onDateSelect(null);
  };

  const days = getDaysInMonth(currentMonth);
  const isCurrentMonth = currentMonth.getMonth() === new Date().getMonth() && 
                        currentMonth.getFullYear() === new Date().getFullYear();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      {/* Compact Header */}
      <View style={styles.compactHeader}>
        <View style={styles.headerLeft}>
          <CalendarIcon size={20} color={theme.colors.primary} />
          <Text style={[styles.monthText, { color: theme.colors.text }]}>
            {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          {/* Today button - only show if not current month */}
          {!isCurrentMonth && (
            <TouchableOpacity
              style={[styles.todayButton, { backgroundColor: theme.colors.primary }]}
              onPress={goToToday}
            >
              <Text style={[styles.todayText, { color: '#fff' }]}>Dzisiaj</Text>
            </TouchableOpacity>
          )}
          
          {/* Clear button - only show if there's a selection */}
          {(selectedDate || rangeStart) && (
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: theme.colors.error }]}
              onPress={clearSelection}
            >
              <X size={14} color="#fff" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.monthButton}
            onPress={() => changeMonth('prev')}
          >
            <ChevronLeft size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.monthButton}
            onPress={() => changeMonth('next')}
          >
            <ChevronRight size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp size={16} color={theme.colors.textSecondary} />
            ) : (
              <ChevronDown size={16} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Expanded Calendar */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Week Days Header */}
          <View style={styles.weekDaysHeader}>
            {weekDays.map((day, index) => (
              <Text 
                key={index} 
                style={[styles.weekDayText, { color: theme.colors.textSecondary }]}
              >
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {days.map((day, index) => (
              <View key={index} style={styles.dayContainer}>
                {day ? (
                  <TouchableOpacity
                    style={[
                      styles.dayButton,
                      getDayStyles(day),
                      {
                        opacity: isInValidRange(day) ? 1 : 0.3,
                        borderWidth: 1
                      }
                    ]}
                    onPress={() => handleDatePress(day)}
                    activeOpacity={0.7}
                    disabled={!isInValidRange(day)}
                  >
                    <Text 
                      style={[
                        styles.dayText,
                        { 
                          color: getDayStyles(day).color,
                          fontWeight: (isToday(day) || isSelected(day) || isRangeStart(day) || isRangeEnd(day)) ? '600' : '400'
                        }
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                    
                    {/* Event indicator */}
                    {hasEvents(day) && (
                      <View style={[
                        styles.eventIndicator,
                        { 
                          backgroundColor: isRangeStart(day) || isRangeEnd(day) || isSelected(day)
                            ? '#fff' 
                            : isInRange(day)
                            ? theme.colors.primary
                            : theme.colors.primary 
                        }
                      ]}>
                        <Text style={[
                          styles.eventCount,
                          { 
                            color: isRangeStart(day) || isRangeEnd(day) || isSelected(day)
                              ? theme.colors.primary 
                              : isInRange(day)
                              ? '#fff'
                              : '#fff',
                            fontSize: getEventCount(day) > 9 ? 8 : 10
                          }
                        ]}>
                          {getEventCount(day)}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.emptyDay} />
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthButton: {
    padding: 6,
    borderRadius: 6,
  },
  expandButton: {
    padding: 6,
    borderRadius: 6,
  },
  todayButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  clearButton: {
    padding: 6,
    borderRadius: 12,
  },
  todayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: 16,
  },
  weekDaysHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayContainer: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButton: {
    width: '80%',
    aspectRatio: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '400',
  },
  emptyDay: {
    width: '80%',
    aspectRatio: 1,
  },
  eventIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCount: {
    fontWeight: '600',
  },
});

export default InlineCalendar; 