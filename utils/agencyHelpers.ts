/**
 * Helper utilities for transit agency branding and icons
 */

/**
 * Get Ionicons icon name for transit agency
 */
export function getAgencyIcon(agency: string | undefined): string {
    if (!agency) return 'bus-outline';
    
    const agencyLower = agency.toLowerCase();
    
    // Bus agencies - CHECK FIRST and carefully
    if (agencyLower.includes('pks') || agencyLower.includes('pksgdynia')) return 'bus'; // PKS Gdynia
    if (agencyLower.includes('mzk') || agencyLower.includes('wejherowo')) return 'bus'; // MZK Wejherowo
    if (agencyLower.includes('zkm')) return 'bus'; // ZKM Gdynia
    if (agencyLower.includes('ztm') || agencyLower.includes('zarząd transportu miejskiego') || agencyLower.includes('zarzad transportu')) return 'tram'; // ZTM Gdańsk (tramwaje)

    // Train/rail agencies - ONLY IF NOT PKS
    if (agencyLower.includes('skm')) return 'train'; // SKM - Fast Urban Railway
    if (agencyLower.includes('polregio') || agencyLower.includes('regio')) return 'train'; // POLREGIO
    if (agencyLower.includes('intercity') || agencyLower.includes('pkp ic') || agencyLower.includes('regiojet') || agencyLower.includes('leo express') || agencyLower.includes('arriva') || agencyLower.includes('koleje')) return 'train'; // IC/RegioJet i inne
    
    // Check for PKP but ensure it is NOT PKS (regex word boundary or explicit check)
    if (agencyLower === 'pkp' || (agencyLower.includes('pkp') && !agencyLower.includes('pks')) || agencyLower.includes('rail')) return 'train';
    
    // Default
    return 'bus-outline';
}

/**
 * Get brand color for transit agency (hex format without #)
 */
export function getAgencyColor(agency: string | undefined): string {
    if (!agency) return '718096'; // Default gray
    
    const agencyLower = agency.toLowerCase();
    
    if (agencyLower.includes('pks') || agencyLower.includes('pksgdynia')) return '388E3C'; // Green
    if (agencyLower.includes('mzk') || agencyLower.includes('wejherowo')) return '1A237E'; // Dark Blue MZK Wejherowo
    if (agencyLower.includes('zkm')) return 'E53935'; // Red ZKM Gdynia
    if (agencyLower.includes('ztm') || agencyLower.includes('zarząd transportu miejskiego') || agencyLower.includes('zarzad transportu')) return 'F57C00'; // Orange ZTM Gdańsk
    
    if (agencyLower.includes('skm')) return 'FFB300'; // Yellow/Gold
    if (agencyLower.includes('polregio') || agencyLower.includes('regio')) return '1A6ADD'; // Blue
    if (agencyLower.includes('intercity') || agencyLower.includes('pkp ic') || agencyLower.includes('regiojet') || agencyLower.includes('leo express') || agencyLower.includes('arriva') || agencyLower.includes('koleje')) return '1A237E'; // Dark Blue pociągi
    if (agencyLower === 'pkp' || (agencyLower.includes('pkp') && !agencyLower.includes('pks'))) return '37474F'; // Dark Gray PKP (but not PKS)
    
    return '718096'; // Default gray
}

/**
 * Get display name for transit agency
 */
export function getAgencyDisplayName(agency: string | undefined): string {
    if (!agency) return 'Inny';
    
    const agencyLower = agency.toLowerCase();
    
    if (agencyLower.includes('pks') || agencyLower.includes('pksgdynia')) return 'PKS Gdynia';
    if (agencyLower.includes('mzk') || agencyLower.includes('wejherowo')) return 'MZK Wejherowo';
    if (agencyLower.includes('zkm')) return 'ZKM Gdynia';
    if (agencyLower.includes('ztm') || agencyLower.includes('zarząd transportu miejskiego') || agencyLower.includes('zarzad transportu')) return 'ZTM Gdańsk';

    if (agencyLower.includes('skm')) return 'SKM';
    if (agencyLower.includes('polregio') || agencyLower.includes('regio')) return 'POLREGIO';
    if (agencyLower.includes('regiojet')) return 'RegioJet';
    if (agencyLower.includes('intercity') || agencyLower.includes('pkp ic')) return 'PKP IC';
    if (agencyLower.includes('leo express')) return 'Leo Express';
    if (agencyLower.includes('arriva')) return 'Arriva';
    if (agencyLower.includes('koleje dolnośląskie') || agencyLower.includes('dolnoslaskie')) return 'Koleje Dolnośląskie';
    if (agencyLower.includes('koleje mazowieckie')) return 'Koleje Mazowieckie';
    if (agencyLower.includes('koleje małopolskie') || agencyLower.includes('malopolskie')) return 'Koleje Małopolskie';
    if (agencyLower.includes('koleje wielkopolskie')) return 'Koleje Wielkopolskie';
    if (agencyLower.includes('koleje śląskie') || agencyLower.includes('slaskie')) return 'Koleje Śląskie';
    if (agencyLower.includes('łódzka kolej') || agencyLower.includes('lodzka kolej')) return 'ŁKA';
    if (agencyLower.includes('koleje')) return 'Koleje regionalne';
    if (agencyLower === 'pkp' || (agencyLower.includes('pkp') && !agencyLower.includes('pks'))) return 'PKP';
    
    return agency;
}

/**
 * Get priority value for transit agency (higher = more important)
 */
export function getAgencyPriority(agency: string | undefined): number {
    if (!agency) return 0;
    
    const agencyLower = agency.toLowerCase();
    
    if (agencyLower.includes('skm')) return 1000;
    if (agencyLower.includes('polregio') || agencyLower.includes('regio')) return 900;
    if (agencyLower.includes('pks') || agencyLower.includes('pksgdynia')) return 850;
    if (agencyLower.includes('mzk') || agencyLower.includes('wejherowo')) return 800;
    if (agencyLower.includes('rail') || agencyLower.includes('pkp')) return 700;
    if (agencyLower.includes('ztm')) return 700;
    if (agencyLower.includes('zkm')) return 600;
    
    return 300;
}
