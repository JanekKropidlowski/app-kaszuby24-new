import { LucideIcon, Trash2, Leaf, Recycle, FileText, GlassWater, Flame, Package } from 'lucide-react-native';

export interface WasteRule {
    id: string;
    title: string;
    color: string;
    icon: any; // LucideIcon type
    description: string;
    allowed: string[];
    forbidden: string[];
    tips?: string[];
}

export const WASTE_RULES: WasteRule[] = [
    {
        id: 'Papier', // Must match the type in JSON/Schedule
        title: 'Papier',
        color: '#3b82f6', // Blue
        icon: FileText,
        description: 'Wrzucamy tu czyste opakowania z papieru i tektury.',
        allowed: [
            'Gazety, czasopisma, katalogi, książki',
            'Zeszyty, torebki papierowe',
            'Kartony i tekturę (także falistą)',
            'Papier pakowy',
            'Wytłaczanki do jajek (czyste)',
            'Blok rysunkowy i techniczny',
            'Cukier - opakowanie papierowe',
            'Czasopisma ilustrowane, Gazety',
            'Kalendarze ścienne i kieszonkowe',
            'Kartki papieru, Notatniki, Notesy',
            'Karton po chusteczkach, lekach, mrożonkach',
            'Karton po proszku do prania',
            'Kartonik po perfumach, żarówce',
            'Komiksy, Koperty papierowe',
            'Książki i zeszyty',
            'Listy, Mapy niepowlekane'
        ],
        forbidden: [
            'Tłustego lub zabrudzonego papieru',
            'Papieru termicznego (paragony)',
            'Papieru przebitkowego (kalki)',
            'Tapet',
            'Opakowań wielomateriałowych (np. kartony po mleku)'
        ],
        tips: ['Zgnieć kartony przed wyrzuceniem, aby zajmowały mniej miejsca.', 'Usuń zszywki i inne metalowe elementy jeśli to możliwe.']
    },
    {
        id: 'Szkło',
        title: 'Szkło',
        color: '#10b981', // Green
        icon: GlassWater,
        description: 'Wrzucamy opróżnione opakowania szklane bez nakrętek.',
        allowed: [
            'Butelki po napojach i żywności',
            'Słoiki po dżemach, przetworach',
            'Szklane opakowania po kosmetykach',
            'Butelki po winie, wodzie, syropach',
            'Butelki szklane po tabletkach i witaminach',
            'Flakoniki po perfumach (szklane)',
            'Kufle szklane',
            'Opakowania po kremach (szklane)',
            'Słoiki po kawie, konserwach, marmoladzie',
            'Szkło opakowaniowe, Wazony szklane'
        ],
        forbidden: [
            'Ceramiki, doniczek, porcelany, fajansu',
            'Szkła okiennego i zbrojonego',
            'Szklanek, kieliszków (szkło stołowe ma inny skład)',
            'Luster',
            'Szkła żaroodpornego',
            'Zniczy z wkładem woskowym',
            'Żarówek i świetlówek'
        ],
        tips: ['Nie musisz myć szkła, ale warto je opróżnić.', 'Nakrętki wyrzuć do metali i tworzyw sztucznych (żółty).']
    },
    {
        id: 'Plastik i metale',
        title: 'Metale i Tworzywa',
        color: '#f59e0b', // Yellow
        icon: Recycle,
        description: 'Szeroka kategoria obejmująca większość opakowań.',
        allowed: [
            'Odkręcone i zgniecione butelki PET',
            'Opakowania po chemii gospodarczej i kosmetykach',
            'Puszki po żywności i napojach',
            'Kartony po mleku i sokach (tzw. tetrapaki)',
            'Folię aluminiową, Torebki foliowe, reklamówki',
            'Zakrętki od słoików i butelek',
            'Aluminiowe tacki (czyste), Aluminium',
            'Antyperspirant (puste opakowanie)',
            'Bidony plastikowe',
            'Butelki po jogurcie, kefirze, ketchupie',
            'Butelki po majonezie, mleku, musztardzie',
            'Butelka po mydle w płynie, szamponie',
            'Opakowania po Ajaxie, Domestosie, Krecie',
            'Pojemniki po płynach do płukania, WC, szyb'
        ],
        forbidden: [
            'Butelek i pojemników z zawartością',
            'Opakowań po lekach',
            'Puszek po farbach, lakierach i olejach',
            'Zużytych baterii i akumulatorów',
            'Zabawek z elementami elektronicznymi'
        ],
        tips: ['Zgnieć butelki i puszki – oszczędzasz miejsce!', 'Nie myj opakowań, jeśli nie są mocno zabrudzone resztkami jedzenia.']
    },
    {
        id: 'Bio',
        title: 'Bio (Odpady BIO)',
        color: '#a16207', // Brown (using a darker yellow/brown hex)
        icon: Leaf,
        description: 'Odpady organiczne ulegające biodegradacji.',
        allowed: [
            'Obierki z warzyw i owoców',
            'Obierki: Ananas, Arbuz, Awokado, Banan',
            'Resztki żywności (bez mięsa)',
            'Fusy z kawy i herbaty, Filtry z fusami',
            'Zwiędłe kwiaty i rośliny doniczkowe',
            'Skorupki jaj, Bułki, Chleb, Ciasta',
            'Resztki owoców i warzyw: Buraki, Cebula',
            'Cukier wanilinowy i Cukierki (bez opakowań)',
            'Cukinia, Cytrusy, Czosnek, Dynia, Fasola',
            'Drożdże, Frytki'
        ],
        forbidden: [
            'Mięsa, kości, ości i tłuszczów zwierzęcych',
            'Ziemi i kamieni',
            'Odchodów zwierzęcych',
            'Popiołu z węgla kamiennego',
            'Płynnych resztek jedzenia (zupy)'
        ],
        tips: ['Wyrzucaj beż worków foliowych (chyba że są kompostowalne).', 'Mięso i kości wrzucamy do Zmieszanych!']
    },
    {
        id: 'Odpady zielone',
        title: 'Odpady Zielone',
        color: '#16a34a', // Green
        icon: Leaf,
        description: 'Odpady z ogrodu.',
        allowed: [
            'Liście, skoszona trawa',
            'Rozdrobnione gałęzie, Chrust, Patyki',
            'Trociny i kora drzew, Szyszki',
            'Choinka żywa (pocięta i zwiędła)',
            'Chwasty, Części zielone roślin',
            'Darń, Korzenie roślin',
            'Kwiaty cięte i doniczkowe',
            'Słoma, Torf, Żołędzie',
            'Wieniec z żywych kwiatów'
        ],
        forbidden: [
            'Ziemi, kamieni',
            'Popiołu',
            'Resztek jedzenia'
        ]
    },
    {
        id: 'Popiół',
        title: 'Popiół',
        color: '#4b5563', // Gray
        icon: Flame,
        description: 'Popiół z pieców domowych.',
        allowed: [
            'Zimny popiół z węgla, koksu lub drewna'
        ],
        forbidden: [
            'Gorącego popiołu (grozi pożarem!)',
            'Popiołu zanieczyszczonego tworzywami sztucznymi'
        ]
    },
    {
        id: 'Zmieszane',
        title: 'Zmieszane',
        color: '#1f2937', // Dark Gray
        icon: Trash2,
        description: 'Wszystko to, czego nie można odzyskać w procesie recyklingu.',
        allowed: [
            'Zużyte środki higieniczne (pieluchy, chusteczki)',
            'Zabrudzony papier (tłusty)',
            'Potłuczone szkło stołowe i ceramika',
            'Mięso, kości, ości, Resztki ryb',
            'Żwirek dla kota',
            'Agrowłóknina, Albumy fotograficzne',
            'Aluminiowe tacki i torebki zabrudzone (np. po pizzy)',
            'Bandaże, Bawełna, Bibuła',
            'Blachy i blaszki do pieczenia (brudne)',
            'Blistry po tabletkach (puste)',
            'Bombki choinkowe, Brudne reklamówki',
            'Butelki plastikowe po lekach',
            'Buteleczka po podkładzie do twarzy',
            'Papier zabrudzony, tłusty'
        ],
        forbidden: [
            'Odpadów niebezpiecznych (baterie, leki, chemikalia)',
            'Elektrośmieci (sprzęt RTV/AGD)',
            'Gruzu budowlanego',
            'Opon'
        ],
        tips: ['To kategoria ostateczna – trafia tu to, co nie pasuje nigdzie indziej.']
    },
    {
        id: 'Gabaryty',
        title: 'Gabaryty',
        color: '#7c3aed', // Purple
        icon: Package,
        description: 'Duże przedmioty, które nie mieszczą się w pojemniku.',
        allowed: [
            'Stare meble (szafy, stoły, krzesła)',
            'Wersalki, materace',
            'Dywany, wykładziny',
            'Wózki dziecięce, rowery'
        ],
        forbidden: [
            'Sprzętu budowlanego i sanitarnego (umywalki, sedesy)',
            'Opon',
            'Elektrośmieci'
        ]
    }
];
