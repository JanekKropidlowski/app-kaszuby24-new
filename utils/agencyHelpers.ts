/**
 * Helper utilities for transit agency branding and icons
 */

/**
 * Get Ionicons icon name for transit agency
 */
export function getAgencyIcon(agency: string | undefined): string {
    if (!agency) return 'bus-outline';
    
    const agencyLower = agency.toLowerCase();
    
    // Train/rail agencies
    if (agencyLower.includes('skm')) return 'train'; // SKM - Fast Urban Railway
    if (agencyLower.includes('polregio') || agencyLower.includes('regio')) return 'train'; // POLREGIO
    if (agencyLower.includes('pkp') || agencyLower.includes('rail')) return 'train';
    
    // Bus agencies
    if (agencyLower.includes('pks') || agencyLower.includes('pksgdynia')) return 'bus'; // PKS Gdynia
    if (agencyLower.includes('mzk') || agencyLower.includes('wejherowo')) return 'bus'; // MZK Wejherowo
    if (agencyLower.includes('ztm') || agencyLower.includes('zkm')) return 'bus';
    
    // Default
    return 'bus-outline';
}

/**
 * Get brand color for transit agency (hex format without #)
 */
export function getAgencyColor(agency: string | undefined): string {
    if (!agency) return '718096'; // Default gray
    
    const agencyLower = agency.toLowerCase();
    
    if (agencyLower.includes('skm')) return 'FFB300'; // Yellow/Gold
    if (agencyLower.includes('polregio') || agencyLower.includes('regio')) return '1A6ADD'; // Blue
    if (agencyLower.includes('pks') || agencyLower.includes('pksgdynia')) return '388E3C'; // Green
    if (agencyLower.includes('mzk') || agencyLower.includes('wejherowo')) return '1A237E'; // Dark Blue
    if (agencyLower.includes('pkp')) return 'D32F2F'; // Red
    if (agencyLower.includes('ztm')) return 'D32F2F'; // Red
    if (agencyLower.includes('zkm')) return '1976D2'; // Blue
    
    return '718096'; // Default gray
}

/**
 * Get display name for transit agency
 */
export function getAgencyDisplayName(agency: string | undefined): string {
    if (!agency) return 'Inny';
    
    const agencyLower = agency.toLowerCase();
    
    if (agencyLower.includes('skm')) return 'SKM';
    if (agencyLower.includes('polregio') || agencyLower.includes('regio')) return 'POLREGIO';
    if (agencyLower.includes('pks') || agencyLower.includes('pksgdynia')) return 'PKS Gdynia';
    if (agencyLower.includes('mzk') || agencyLower.includes('wejherowo')) return 'MZK Wejherowo';
    if (agencyLower.includes('pkp')) return 'PKP';
    if (agencyLower.includes('ztm')) return 'ZTM';
    if (agencyLower.includes('zkm')) return 'ZKM';
    
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
