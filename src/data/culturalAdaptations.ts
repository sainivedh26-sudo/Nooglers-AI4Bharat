export interface CulturalChange {
    timestamp: string;
    original: string;
    adapted: string;
    category: string;
    reason: string;
}

export const CULTURAL_ADAPTATIONS: Record<string, CulturalChange[]> = {
    // Video 1: Hindi News (PN_BobZTYGo) -> Malayalam
    "vi1-ml": [
        {
            timestamp: "0:25",
            original: "Festival Sweets (Laddoos)",
            adapted: "നെയ്യപ്പം & ഉണ്ണിയപ്പം (Neyyappam & Unniyappam)",
            category: "Food",
            reason: "Replaced general North Indian sweets with traditional Kerala temple-style snacks for better local resonance."
        },
        {
            timestamp: "1:45",
            original: "Saffron Turban (Pagri)",
            adapted: "കസവ് മുണ്ട് (Kasavu Mundu)",
            category: "Attire",
            reason: "Swapped the symbol of authority from a North Indian turban to the prestigious Kerala Kasavu attire."
        },
        {
            timestamp: "3:10",
            original: "North Indian Festive Garlands",
            adapted: "ചെട്ടിപ്പൂവും തുളസിയും (Marigold & Tulsi Garlands)",
            category: "Tradition",
            reason: "Specific floral combinations used in Kerala ceremonies were substituted for generic marigolds."
        }
    ],

    // Video 2: SOTY Rapid Fire (IDlKXoOKW_s) -> Telugu
    "vi2-te": [
        {
            timestamp: "0:11",
            original: "The Iconic Coffee Hamper",
            adapted: "బంగారు పళ్లెం & సాంప్రదాయ కానుకలు (Golden Thali & Traditional Gifts)",
            category: "Object",
            reason: "Shifted from a westernized 'hamper' to a more prestigious Telugu traditional gift offering."
        },
        {
            timestamp: "0:40",
            original: "Taking the Coffee Oath",
            adapted: "కాఫీ మీద ప్రమాణం (The Filter Coffee Promise)",
            category: "Tradition",
            reason: "Localized the 'Coffee' culture to South India's strong focus on traditional Filter Coffee."
        },
        {
            timestamp: "1:55",
            original: "Designer Boutique Saree",
            adapted: "ధర్మవరం పట్టు చీర (Dharmavaram Silk Saree)",
            category: "Attire",
            reason: "Replaced generic designer label references with Andhra's world-famous Dharmavaram silk heritage."
        },
        {
            timestamp: "3:40",
            original: "Mumbai High-Society Gala",
            adapted: "హైదరాబాదీ రాజరికం (Hyderabadi Royal Gathering)",
            category: "Context",
            reason: "Mapped the 'elite' context from Mumbai's film circle to the Nizami/Royal heritage of Hyderabad."
        }
    ],

    // Video 2: SOTY Rapid Fire (IDlKXoOKW_s) -> Tamil
    "vi2-ta": [
        {
            timestamp: "0:25",
            original: "Designer Label Outfits",
            adapted: "காஞ்சிபுரம் பட்டு (Kanjivaram Silk)",
            category: "Attire",
            reason: "Transcreated high-fashion status symbols into the gold standard of Tamil weddings: Kanjivaram silk."
        },
        {
            timestamp: "1:20",
            original: "The Rapid Fire Hamper",
            adapted: "வெள்ளித் தட்டு பரிசுகள் (Silver Thali Gifts)",
            category: "Object",
            reason: "Used the traditional silver plate presentation style common in prestigious Tamil functions."
        },
        {
            timestamp: "4:15",
            original: "Chocolates & Exotics",
            adapted: "திருநெல்வேలి அல்வா (Tirunelveli Halwa)",
            category: "Food",
            reason: "Swapped generic luxury sweets for the culturally legendary Tirunelveli Halwa."
        }
    ],

    // Video 3: Oru Adaar Love (hGfxCYgOZ6U) -> Hindi
    "vi3-hi": [
        {
            timestamp: "0:08",
            original: "Kattan Chaya (Black Tea)",
            adapted: "कुल्हड़ वाली मसाला चाय (Kulhad Masala Chai)",
            category: "Beverage",
            reason: "Adapted the simple Kerala black tea to the North Indian preference for spiced tea in clay cups."
        },
        {
            timestamp: "1:22",
            original: "Kasavu Mundu (Dhoti)",
            adapted: "कुर्ता पाजामा (Kurta Pyjama)",
            category: "Attire",
            reason: "Replaced the Kerala traditional dhoti with the North Indian standard for formal/school celebrations."
        },
        {
            timestamp: "2:45",
            original: "Banana Chips",
            adapted: "समोसा और चटनी (Samosa & Chutney)",
            category: "Food",
            reason: "Swapped the iconic Kerala snack for the most common North Indian tea-time companion."
        }
    ],

    // Video 3: Oru Adaar Love (hGfxCYgOZ6U) -> Tamil
    "vi3-ta": [
        {
            timestamp: "0:08",
            original: "Kattan Chaya",
            adapted: "பில்டர் காபி (Filter Coffee)",
            category: "Beverage",
            reason: "Mapped the casual drink to the quintessential Tamil morning ritual of Filter Coffee."
        },
        {
            timestamp: "1:15",
            original: "Kasavu Saree",
            adapted: "காஞ்சிபுரம் பட்டு (Kanjivaram Saree)",
            category: "Attire",
            reason: "Direct cultural mapping of high-quality traditional festive wear from Kerala to Tamil Nadu."
        }
    ],

    // Video 3: Oru Adaar Love (hGfxCYgOZ6U) -> Telugu
    "vi3-te": [
        {
            timestamp: "0:08",
            original: "Kattan Chaya",
            adapted: "ఇడ్లీ సాంబార్ & అల్లం టీ (Idli Sambar & Ginger Tea)",
            category: "Food",
            reason: "Replaced the simple drink with a more wholesome Telugu breakfast/tea cultural equivalent."
        },
        {
            timestamp: "2:10",
            original: "Kerala Palm Trees",
            adapted: "కోనసీమ కొబ్బరి చెట్లు (Konaseema Coconut Groves)",
            category: "Context",
            reason: "Referenced Konaseema — the lush, green delta region known as the 'Kerala of Andhra Pradesh'."
        }
    ]
};
