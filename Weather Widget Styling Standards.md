# Weather Widget Styling Standards

## Overview
This document outlines the standardized styling approach for all specialized weather widgets in the Kaszuby24 application. The goal is to ensure visual consistency and maintainability across all weather-related components.

## Container Standards

### Main Container
- **Background**: `#FFFFFF` (white)
- **Border Radius**: `16px`
- **Padding**: `16px`
- **Margins**: `8px` horizontal, `8px` vertical
- **Shadow**: 
  - `shadowColor: '#000'`
  - `shadowOffset: { width: 0, height: 2 }`
  - `shadowOpacity: 0.08`
  - `shadowRadius: 8px`
  - `elevation: 3` (Android)

## Header Standards

### Header Container
- **Layout**: `flexDirection: 'row'`
- **Alignment**: `alignItems: 'center'`
- **Margin Bottom**: `16px`

### Icon Container
- **Dimensions**: `48px × 48px`
- **Border Radius**: `24px` (circular)
- **Alignment**: `alignItems: 'center'`, `justifyContent: 'center'`
- **Margin Right**: `12px`

### Title
- **Font Size**: `18px`
- **Font Weight**: `700` (Bold)
- **Font Family**: `Poppins_Bold`
- **Margin Bottom**: `4px`

### Subtitle
- **Font Size**: `14px`
- **Font Weight**: `400` (Regular)
- **Font Family**: `Poppins_Regular`

## Content Standards

### Content Container
- **Gap**: `16px` between sections

### Rating Container
- **Layout**: `flexDirection: 'row'`
- **Gap**: `12px` between rating cards

### Rating Card
- **Layout**: `flex: 1` (equal width)
- **Alignment**: `alignItems: 'center'`
- **Padding**: `16px`
- **Border Radius**: `12px`
- **Min Height**: `80px`
- **Justify Content**: `center`

### Rating Typography
- **Title**: `12px`, `500` weight, `Poppins_Medium`
- **Value**: `16px`, `700` weight, `Poppins_Bold`
- **Stars/Subtext**: `14px`/`10px`, `600` weight, `Poppins_SemiBold`

## Weather Grid Standards

### Weather Grid Container
- **Layout**: `flexDirection: 'row'`, `flexWrap: 'wrap'`
- **Gap**: `8px` between weather cards

### Weather Card
- **Layout**: `flex: 1`, `minWidth: '45%'`
- **Alignment**: `alignItems: 'center'`
- **Padding**: `12px`
- **Border Radius**: `12px`
- **Min Height**: `80px`
- **Justify Content**: `center`
- **Shadow**: 
  - `shadowColor: '#000'`
  - `shadowOffset: { width: 0, height: 1 }`
  - `shadowOpacity: 0.05`
  - `shadowRadius: 4px`
  - `elevation: 1`

### Weather Card Typography
- **Value**: `16px`, `700` weight, `Poppins_Bold`
- **Label**: `11px`, `500` weight, `Poppins_Medium`

## Info Card Standards

### Info Card Container
- **Layout**: `flexDirection: 'row'`, `alignItems: 'center'`
- **Padding**: `12px`
- **Border Radius**: `12px`
- **Gap**: `8px`
- **Shadow**: Same as weather cards

### Info Card Typography
- **Text**: `14px`, `500` weight, `Poppins_Medium`
- **Flex**: `1` (expand to fill available space)

## Recommendations & Tips Standards

### Container
- **Layout**: `flexDirection: 'row'`, `alignItems: 'center'`
- **Padding**: `12px`
- **Border Radius**: `12px`
- **Gap**: `8px`
- **Shadow**: Same as other cards

### Typography
- **Text**: `14px`, `500` weight, `Poppins_Medium`
- **Flex**: `1`

## Warning Container Standards

### Container
- **Layout**: `flexDirection: 'row'`, `alignItems: 'center'`
- **Padding**: `12px`
- **Border Radius**: `12px`
- **Gap**: `8px`
- **Shadow**: Same as other cards

### Typography
- **Text**: `14px`, `600` weight, `Poppins_SemiBold`
- **Flex**: `1`

## Applied Widgets

The following specialized weather widgets have been standardized according to these guidelines:

1. **HikerWeatherWidget** ✅
2. **FarmerWeatherWidget** ✅
3. **CyclistWeatherWidget** ✅
4. **DriverWeatherWidget** ✅
5. **MarineWeatherWidget** ✅
6. **TouristWeatherWidget** ✅
7. **SportsWeatherWidget** ✅
8. **AthleteWeatherWidget** ✅

## Benefits of Standardization

### Visual Consistency
- All widgets now have the same visual hierarchy
- Consistent spacing and sizing across components
- Unified shadow and elevation system

### Maintainability
- Single source of truth for styling values
- Easier to update design system globally
- Reduced code duplication

### User Experience
- Familiar visual patterns across all weather widgets
- Consistent touch targets and spacing
- Professional, polished appearance

### Development Efficiency
- Faster development of new weather widgets
- Reduced design decisions during implementation
- Easier onboarding for new developers

## Future Updates

When adding new specialized weather widgets:

1. Follow the established container standards
2. Use the defined typography scale
3. Apply consistent shadow and elevation values
4. Maintain the 8px/16px spacing system
5. Use the standardized Poppins font family variants

## Color System

The widgets use the theme-based color system:
- **Primary**: `#224A96` (brand blue)
- **Secondary**: `#FECC00` (brand yellow)
- **Success**: `#10B981` (green)
- **Warning**: `#F59E0B` (orange)
- **Error**: `#EF4444` (red)
- **Info**: `#3B82F6` (blue)

## Responsive Considerations

- All widgets use flexible layouts with `flex` properties
- Minimum widths ensure readability on small screens
- Consistent touch targets (minimum 48px) for mobile usability
- Shadow effects optimized for both iOS and Android platforms
