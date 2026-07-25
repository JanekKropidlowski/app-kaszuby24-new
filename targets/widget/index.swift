import WidgetKit
import SwiftUI
import AppIntents
import UIKit

// MARK: - Konfiguracja współdzielona (musi zgadzać się z lib/widget-shared.ts)
private let APP_GROUP = "group.app.kaszuby24"
private let K_WEATHER = "kaszuby24.widget.weather"
private let K_AIR = "kaszuby24.widget.air"
private let K_WASTE = "kaszuby24.widget.waste"
private let K_EVENTS = "kaszuby24.widget.events"
private let K_POSTS = "kaszuby24.widget.posts"

private let BRAND = Color(hexString: "#224A96", fallback: Color(red: 0.13, green: 0.29, blue: 0.59))
private let ACCENT = Color(hexString: "#FECC00", fallback: .yellow)
private let FG = Color.white

// MARK: - Modele (podzbiór payloadów z lib/widget-sync)
struct WHour: Decodable { let h: String; let t: Double; let icon: String }
struct WWeather: Decodable { let tempC: Double; let icon: String; let desc: String; let city: String; let hi: Double?; let lo: Double?; let feels: Double?; let hours: [WHour]? }
struct WAir: Decodable { let index: Int?; let category: String?; let color: String; let city: String }
struct WWasteItem: Decodable { let date: String; let fraction: String }
struct WWaste: Decodable { let empty: Bool; let gmina: String?; let next: [WWasteItem]?; let reason: String? }
struct WPost: Decodable {
  let id: Int; let slug: String; let title: String; let imageUrl: String?; let category: String?; let date: String
  // Pobierane w providerze (WidgetKit nie renderuje AsyncImage) — poza JSON.
  var imageData: Data? = nil
  enum CodingKeys: String, CodingKey { case id, slug, title, imageUrl, category, date }
}
struct WEvent: Decodable { let id: Int; let slug: String; let title: String; let startsAt: String; let location: String? }

// MARK: - Odczyt z App Group
private func loadJSON<T: Decodable>(_ key: String, _ type: T.Type) -> T? {
  guard let defaults = UserDefaults(suiteName: APP_GROUP),
        let str = defaults.string(forKey: key),
        let data = str.data(using: .utf8) else { return nil }
  return try? JSONDecoder().decode(T.self, from: data)
}

// MARK: - Helpery
extension Color {
  init(hexString: String?, fallback: Color) {
    guard var hex = hexString?.trimmingCharacters(in: .whitespaces) else { self = fallback; return }
    if hex.hasPrefix("#") { hex.removeFirst() }
    guard hex.count == 6, let val = UInt64(hex, radix: 16) else { self = fallback; return }
    self = Color(
      red: Double((val & 0xFF0000) >> 16) / 255.0,
      green: Double((val & 0x00FF00) >> 8) / 255.0,
      blue: Double(val & 0x0000FF) / 255.0
    )
  }
  func darker(by amount: Double = 0.16) -> Color {
    let ui = UIColor(self)
    var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
    ui.getRed(&r, green: &g, blue: &b, alpha: &a)
    return Color(red: max(0, Double(r) - amount), green: max(0, Double(g) - amount), blue: max(0, Double(b) - amount))
  }
}

func poppins(_ weight: String, _ size: CGFloat) -> Font { .custom("Poppins-\(weight)", size: size) }

private func parseISO(_ s: String?) -> Date? {
  guard let s = s, !s.isEmpty else { return nil }
  let f = ISO8601DateFormatter()
  f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  if let d = f.date(from: s) { return d }
  f.formatOptions = [.withInternetDateTime]
  if let d = f.date(from: s) { return d }
  // "2026-07-21" lub "2026-07-21T09:00:00"
  let df = DateFormatter()
  df.locale = Locale(identifier: "pl_PL")
  df.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
  if let d = df.date(from: s) { return d }
  df.dateFormat = "yyyy-MM-dd"
  return df.date(from: s)
}

private func dayMonth(_ s: String) -> String {
  guard let d = parseISO(s) else { return "" }
  let f = DateFormatter(); f.locale = Locale(identifier: "pl_PL"); f.timeZone = TimeZone(identifier: "Europe/Warsaw"); f.dateFormat = "dd.MM"
  return f.string(from: d)
}

private func timeAgo(_ s: String) -> String {
  guard let d = parseISO(s) else { return "" }
  let min = Int(Date().timeIntervalSince(d) / 60)
  if min < 1 { return "przed chwilą" }
  if min < 60 { return "\(min) min temu" }
  let h = min / 60
  if h < 24 { return "\(h) godz. temu" }
  return "\(h / 24) dni temu"
}

/// Kod ikony OpenWeatherMap → SF Symbol.
private func owmSymbol(_ code: String) -> String {
  let c = String(code.prefix(2))
  let night = code.hasSuffix("n")
  switch c {
  case "01": return night ? "moon.stars.fill" : "sun.max.fill"
  case "02": return night ? "cloud.moon.fill" : "cloud.sun.fill"
  case "03", "04": return "cloud.fill"
  case "09": return "cloud.rain.fill"
  case "10": return night ? "cloud.moon.rain.fill" : "cloud.sun.rain.fill"
  case "11": return "cloud.bolt.rain.fill"
  case "13": return "snowflake"
  case "50": return "cloud.fog.fill"
  default: return "cloud.fill"
  }
}

private func cleanTitle(_ raw: String) -> String {
  var t = raw
  let entities = ["&amp;": "&", "&#8211;": "–", "&#8212;": "—", "&#8217;": "’", "&#8222;": "„", "&#8221;": "”", "&#8230;": "…", "&quot;": "\"", "&nbsp;": " "]
  for (k, v) in entities { t = t.replacingOccurrences(of: k, with: v) }
  t = t.replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
  return t.trimmingCharacters(in: .whitespacesAndNewlines)
}

// MARK: - Nagłówek marki
struct BrandHeader: View {
  var label: String
  var body: some View {
    HStack(spacing: 5) {
      if let logo = UIImage(named: "logo-mark-white") {
        Image(uiImage: logo)
          .resizable()
          .scaledToFit()
          .frame(width: 34, height: 34)
      }
      Text("Kaszuby24").font(poppins("SemiBold", 10)).opacity(0.9)
      Spacer()
      Text(label).font(poppins("Medium", 10)).opacity(0.7).lineLimit(1)
    }
    .foregroundColor(FG)
  }
}

// Podpis źródła danych (pogoda/powietrze — dane zewnętrzne Open-Meteo).
struct SourceCaption: View {
  var text: String
  var body: some View {
    Text(text).font(poppins("Medium", 9)).foregroundColor(FG).opacity(0.55)
  }
}

// Pusty stan: ikona + komunikat, wyśrodkowane w dostępnej przestrzeni (zamiast tekstu przyklejonego do góry).
struct EmptyState: View {
  var systemImage: String
  var text: String
  var body: some View {
    VStack(spacing: 6) {
      Spacer(minLength: 0)
      Image(systemName: systemImage).font(.system(size: 22)).foregroundColor(FG.opacity(0.8))
      Text(text).font(poppins("SemiBold", 13)).foregroundColor(FG).multilineTextAlignment(.center).lineLimit(2)
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

// tło marki z gradientem + iOS16/17 kompatybilność
struct BrandBackground<Content: View>: View {
  var family: WidgetFamily
  @ViewBuilder var content: () -> Content
  private var gradient: LinearGradient { LinearGradient(colors: [BRAND, BRAND.darker()], startPoint: .topLeading, endPoint: .bottomTrailing) }
  private var isAccessory: Bool { family == .accessoryRectangular || family == .accessoryInline || family == .accessoryCircular }
  var body: some View {
    if #available(iOS 17.0, *) {
      content().padding(family == .accessoryInline ? 0 : 14).containerBackground(for: .widget) { isAccessory ? AnyView(Color.clear) : AnyView(gradient) }
    } else {
      content().padding(family == .accessoryInline ? 0 : 14).background(isAccessory ? AnyView(Color.clear) : AnyView(gradient)).clipShape(RoundedRectangle(cornerRadius: 20))
    }
  }
}

// MARK: - Pogoda
struct PogodaEntry: TimelineEntry { let date: Date; let w: WWeather? }
struct PogodaProvider: TimelineProvider {
  func placeholder(in c: Context) -> PogodaEntry { PogodaEntry(date: Date(), w: nil) }
  func getSnapshot(in c: Context, completion: @escaping (PogodaEntry) -> Void) { completion(PogodaEntry(date: Date(), w: loadJSON(K_WEATHER, WWeather.self))) }
  func getTimeline(in c: Context, completion: @escaping (Timeline<PogodaEntry>) -> Void) {
    let entry = PogodaEntry(date: Date(), w: loadJSON(K_WEATHER, WWeather.self))
    let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}
struct PogodaEntryView: View {
  var entry: PogodaEntry
  @Environment(\.widgetFamily) var family
  var body: some View {
    let w = entry.w
    switch family {
    case .accessoryInline:
      Text(w != nil ? "\(Int(w!.tempC))° \(w!.city)" : "Kaszuby24")
    case .accessoryRectangular:
      HStack {
        if let w = w { Image(systemName: owmSymbol(w.icon)); Text("\(Int(w.tempC))° \(w.city)").font(poppins("Bold", 15)).lineLimit(1) }
        else { Text("Pogoda").font(poppins("Bold", 15)) }
      }
    default:
      BrandBackground(family: family) {
        VStack(alignment: .leading, spacing: family == .systemSmall ? 2 : 5) {
          BrandHeader(label: w?.city ?? "Pogoda")
          if let w = w {
            if family == .systemSmall {
              // MAŁY: duża temperatura + kolorowa ikona, opis, odczuwalna
              Spacer(minLength: 0)
              HStack(alignment: .center, spacing: 8) {
                Text("\(Int(w.tempC))°").font(poppins("Bold", 36)).foregroundColor(FG)
                Image(systemName: owmSymbol(w.icon))
                  .font(.system(size: 30))
                  .symbolRenderingMode(.multicolor)
              }
              Text(w.desc).font(poppins("Medium", 11)).foregroundColor(FG).opacity(0.85).lineLimit(1)
              if let feels = w.feels {
                Text("odczuwalna \(Int(feels))°").font(poppins("SemiBold", 10)).foregroundColor(ACCENT).lineLimit(1)
              } else if let hi = w.hi, let lo = w.lo {
                Text("↑\(Int(hi))°  ↓\(Int(lo))°").font(poppins("SemiBold", 10)).foregroundColor(ACCENT)
              }
            } else {
              // ŚREDNI: temperatura + opis po lewej, hi/lo/odczuwalna po prawej,
              // pod spodem pasek prognozy co 3h z kolorowymi ikonami (à la Yandex)
              HStack(alignment: .center, spacing: 10) {
                Image(systemName: owmSymbol(w.icon))
                  .font(.system(size: 32))
                  .symbolRenderingMode(.multicolor)
                Text("\(Int(w.tempC))°").font(poppins("Bold", 34)).foregroundColor(FG)
                VStack(alignment: .leading, spacing: 1) {
                  Text(w.desc).font(poppins("SemiBold", 12)).foregroundColor(FG).lineLimit(1)
                  HStack(spacing: 6) {
                    if let hi = w.hi, let lo = w.lo {
                      Text("↑\(Int(hi))° ↓\(Int(lo))°").font(poppins("SemiBold", 11)).foregroundColor(ACCENT)
                    }
                    if let feels = w.feels {
                      Text("odcz. \(Int(feels))°").font(poppins("Medium", 11)).foregroundColor(FG).opacity(0.7)
                    }
                  }
                }
                Spacer(minLength: 0)
              }
              if let hours = w.hours, hours.count > 1 {
                let strip = Array(hours.prefix(6))
                HStack(alignment: .center, spacing: 0) {
                  ForEach(strip.indices, id: \.self) { i in
                    VStack(spacing: 2) {
                      Text("\(Int(strip[i].t))°").font(poppins("SemiBold", 11)).foregroundColor(FG)
                      Image(systemName: owmSymbol(strip[i].icon))
                        .font(.system(size: 13))
                        .symbolRenderingMode(.multicolor)
                        .frame(height: 16)
                      Text(strip[i].h).font(poppins("Medium", 8)).foregroundColor(FG).opacity(0.55)
                    }
                    .frame(maxWidth: .infinity)
                  }
                }
                .padding(.top, 2)
              } else {
                SourceCaption(text: "Źródło: Open-Meteo")
              }
            }
          } else {
            EmptyState(systemImage: "location.slash", text: "Otwórz apkę, by zobaczyć pogodę")
          }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      }
      .widgetURL(URL(string: "kaszuby24://weather"))
    }
  }
}
struct PogodaWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "Pogoda", provider: PogodaProvider()) { PogodaEntryView(entry: $0) }
      .configurationDisplayName("Pogoda")
      .description("Aktualna pogoda dla Twojej okolicy.")
      .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline])
  }
}

// MARK: - Jakość powietrza
struct AirEntry: TimelineEntry { let date: Date; let a: WAir? }
struct AirProvider: TimelineProvider {
  func placeholder(in c: Context) -> AirEntry { AirEntry(date: Date(), a: nil) }
  func getSnapshot(in c: Context, completion: @escaping (AirEntry) -> Void) { completion(AirEntry(date: Date(), a: loadJSON(K_AIR, WAir.self))) }
  func getTimeline(in c: Context, completion: @escaping (Timeline<AirEntry>) -> Void) {
    let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
    completion(Timeline(entries: [AirEntry(date: Date(), a: loadJSON(K_AIR, WAir.self))], policy: .after(next)))
  }
}
struct AirEntryView: View {
  var entry: AirEntry
  @Environment(\.widgetFamily) var family
  var body: some View {
    let a = entry.a
    switch family {
    case .accessoryCircular:
      ZStack { AccessoryWidgetBackground(); VStack(spacing: 1) { Image(systemName: "aqi.medium"); if let i = a?.index { Text("\(i)").font(poppins("Bold", 12)) } } }
    case .accessoryInline:
      Text(a?.category != nil ? "Powietrze: \(a!.category!)" : "Powietrze")
    default:
      BrandBackground(family: family) {
        VStack(alignment: .leading, spacing: 4) {
          BrandHeader(label: a?.city ?? "Powietrze")
          if let a = a, let cat = a.category, let idx = a.index {
            let col = Color(hexString: a.color, fallback: .gray)
            if family == .systemSmall {
              // MAŁY: półkolisty zegar AQI + kategoria + podpowiedź
              Spacer(minLength: 0)
              HStack {
                Spacer(minLength: 0)
                ZStack {
                  Circle().trim(from: 0.5, to: 1).stroke(FG.opacity(0.15), style: StrokeStyle(lineWidth: 8, lineCap: .round))
                  Circle().trim(from: 0.5, to: 0.5 + min(Double(idx), 100) / 200).stroke(col, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                  Text("\(idx)").font(poppins("Bold", 24)).foregroundColor(FG).offset(y: -6)
                }
                .frame(width: 84, height: 84).frame(height: 48, alignment: .top).clipped()
                Spacer(minLength: 0)
              }
              HStack {
                Spacer(minLength: 0)
                Text(cat).font(poppins("SemiBold", 10)).foregroundColor(BRAND.darker())
                  .padding(.horizontal, 10).padding(.vertical, 2)
                  .background(Capsule().fill(col))
                Spacer(minLength: 0)
              }
              Text(airTip(cat)).font(poppins("Medium", 10)).foregroundColor(FG).opacity(0.6)
                .frame(maxWidth: .infinity, alignment: .center).lineLimit(1)
            } else {
              // ŚREDNI: duża liczba + kategoria + skala z markerem
              HStack(alignment: .center, spacing: 12) {
                Text("\(idx)").font(poppins("Bold", 34)).foregroundColor(FG)
                VStack(alignment: .leading, spacing: 3) {
                  Text(cat).font(poppins("SemiBold", 11)).foregroundColor(BRAND.darker())
                    .padding(.horizontal, 10).padding(.vertical, 2)
                    .background(Capsule().fill(col))
                  Text("jakość powietrza · \(airTip(cat))").font(poppins("Medium", 10)).foregroundColor(FG).opacity(0.65).lineLimit(1)
                }
                Spacer(minLength: 0)
              }
              Spacer(minLength: 0)
              GeometryReader { geo in
                ZStack(alignment: .leading) {
                  Capsule()
                    .fill(LinearGradient(colors: [Color(hexString: "#10B981", fallback: .green), Color(hexString: "#84CC16", fallback: .green), Color(hexString: "#F59E0B", fallback: .orange), Color(hexString: "#EF4444", fallback: .red), Color(hexString: "#7C3AED", fallback: .purple)], startPoint: .leading, endPoint: .trailing))
                    .frame(height: 8)
                  Circle().fill(FG).overlay(Circle().stroke(BRAND.darker(), lineWidth: 3))
                    .frame(width: 14, height: 14)
                    .offset(x: max(0, min(Double(idx), 100) / 100 * (geo.size.width - 14)))
                }
              }
              .frame(height: 14)
              HStack {
                Text("0 dobra").font(poppins("Medium", 8)).foregroundColor(FG).opacity(0.55)
                Spacer()
                Text("100+ bardzo zła").font(poppins("Medium", 8)).foregroundColor(FG).opacity(0.55)
              }
            }
          } else {
            EmptyState(systemImage: "aqi.medium", text: "Otwórz apkę, by sprawdzić powietrze")
          }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      }
      .widgetURL(URL(string: "kaszuby24://airquality"))
    }
  }
}

/** Ludzka podpowiedź do kategorii jakości powietrza. */
private func airTip(_ cat: String) -> String {
  let c = cat.lowercased()
  if c.contains("bardzo dobra") || c == "dobra" { return "idealnie na spacer i rower" }
  if c.contains("umiark") { return "OK na krótką aktywność" }
  if c.contains("bardzo z") { return "lepiej zostać w domu" }
  if c.contains("z") { return "ogranicz wysiłek na zewnątrz" }
  return "sprawdź szczegóły w aplikacji"
}
struct PowietrzeWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "Powietrze", provider: AirProvider()) { AirEntryView(entry: $0) }
      .configurationDisplayName("Jakość powietrza")
      .description("Indeks jakości powietrza w Twojej okolicy.")
      .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryInline])
  }
}

// MARK: - Wywóz odpadów
struct WasteEntry: TimelineEntry { let date: Date; let waste: WWaste? }
struct WasteProvider: TimelineProvider {
  func placeholder(in c: Context) -> WasteEntry { WasteEntry(date: Date(), waste: nil) }
  func getSnapshot(in c: Context, completion: @escaping (WasteEntry) -> Void) { completion(WasteEntry(date: Date(), waste: loadJSON(K_WASTE, WWaste.self))) }
  func getTimeline(in c: Context, completion: @escaping (Timeline<WasteEntry>) -> Void) {
    let next = Calendar.current.date(byAdding: .hour, value: 3, to: Date()) ?? Date().addingTimeInterval(10800)
    completion(Timeline(entries: [WasteEntry(date: Date(), waste: loadJSON(K_WASTE, WWaste.self))], policy: .after(next)))
  }
}
// Frakcja → kolor + symbol (standardowe kolory segregacji w PL).
private func fractionStyle(_ name: String) -> (color: Color, symbol: String) {
  let n = name.lowercased()
  if n.contains("bio") { return (Color(hexString: "#7CB342", fallback: .green), "leaf.fill") }
  if n.contains("papier") { return (Color(hexString: "#42A5F5", fallback: .blue), "newspaper.fill") }
  if n.contains("szk") { return (Color(hexString: "#26A69A", fallback: .green), "takeoutbag.and.cup.and.straw.fill") }
  if n.contains("plastik") || n.contains("tworzywa") || n.contains("metal") {
    return (Color(hexString: "#FECC00", fallback: .yellow), "arrow.3.trianglepath")
  }
  if n.contains("gabaryt") || n.contains("wielko") { return (Color(hexString: "#AB47BC", fallback: .purple), "sofa.fill") }
  if n.contains("popi") { return (Color(hexString: "#8D6E63", fallback: .brown), "flame.fill") }
  return (Color(hexString: "#90A4AE", fallback: .gray), "trash.fill") // zmieszane / inne
}

/** "dziś" / "jutro" / "za N dni" względem Europe/Warsaw. */
private func inDays(_ s: String) -> String {
  guard let d = parseISO(s) else { return "" }
  var cal = Calendar(identifier: .gregorian)
  cal.timeZone = TimeZone(identifier: "Europe/Warsaw") ?? .current
  let days = cal.dateComponents([.day], from: cal.startOfDay(for: Date()), to: cal.startOfDay(for: d)).day ?? 0
  if days <= 0 { return "dziś" }
  if days == 1 { return "jutro" }
  return "za \(days) dni"
}

/** Główny napis terminu: do 7 dni relatywnie ("Dziś"/"Jutro"/"Za 2 dni"), dalej data. */
private func heroWhen(_ s: String) -> String {
  guard let d = parseISO(s) else { return dayMonth(s) }
  var cal = Calendar(identifier: .gregorian)
  cal.timeZone = TimeZone(identifier: "Europe/Warsaw") ?? .current
  let days = cal.dateComponents([.day], from: cal.startOfDay(for: Date()), to: cal.startOfDay(for: d)).day ?? 0
  if days >= 7 { return dayMonth(s) }
  let rel = inDays(s)
  return rel.prefix(1).uppercased() + rel.dropFirst()
}

/** Pełna nazwa dnia tygodnia po polsku, np. "Poniedziałek". */
private func weekdayFull(_ s: String) -> String {
  guard let d = parseISO(s) else { return "" }
  let f = DateFormatter(); f.locale = Locale(identifier: "pl_PL"); f.timeZone = TimeZone(identifier: "Europe/Warsaw"); f.dateFormat = "EEEE"
  let name = f.string(from: d)
  return name.prefix(1).uppercased() + name.dropFirst()
}

/** Skrót dnia tygodnia po polsku, np. "pon". */
private func weekdayShort(_ s: String) -> String {
  guard let d = parseISO(s) else { return "" }
  let f = DateFormatter(); f.locale = Locale(identifier: "pl_PL"); f.timeZone = TimeZone(identifier: "Europe/Warsaw"); f.dateFormat = "EE"
  return f.string(from: d).replacingOccurrences(of: ".", with: "")
}

/** Plakietka frakcji: kolorowy kwadracik z symbolem. */
private struct FractionBadge: View {
  var fraction: String
  var size: CGFloat
  var body: some View {
    let st = fractionStyle(fraction)
    Image(systemName: st.symbol)
      .font(.system(size: size * 0.5, weight: .semibold))
      .foregroundColor(.white)
      .frame(width: size, height: size)
      .background(RoundedRectangle(cornerRadius: size * 0.28).fill(st.color))
  }
}

/** Wiersz "kolejnego" wywozu: kropka frakcji + data + nazwa. */
private struct UpcomingRow: View {
  var item: WWasteItem
  var body: some View {
    HStack(spacing: 6) {
      Circle().fill(fractionStyle(item.fraction).color).frame(width: 7, height: 7)
      Text(weekdayShort(item.date))
        .font(poppins("SemiBold", 11)).foregroundColor(FG).opacity(0.95)
        .frame(width: 30, alignment: .leading)
      Text(item.fraction)
        .font(poppins("Medium", 11)).foregroundColor(FG).opacity(0.7).lineLimit(1)
      Spacer(minLength: 0)
    }
  }
}

struct WasteEntryView: View {
  var entry: WasteEntry
  @Environment(\.widgetFamily) var family
  var body: some View {
    let waste = entry.waste
    BrandBackground(family: family) {
      VStack(alignment: .leading, spacing: family == .systemSmall ? 4 : 6) {
        BrandHeader(label: (waste != nil && !waste!.empty) ? (waste!.gmina ?? "Odpady") : "Odpady")
        if let waste = waste, !waste.empty, let items = waste.next, let first = items.first {
          if family == .systemSmall {
            // MAŁY: najbliższy wywóz — plakietka + data + frakcja + "za X dni"
            Spacer(minLength: 0)
            HStack(spacing: 8) {
              FractionBadge(fraction: first.fraction, size: 30)
              VStack(alignment: .leading, spacing: 0) {
                Text(heroWhen(first.date))
                  .font(poppins("Bold", 19)).foregroundColor(ACCENT)
                  .lineLimit(1).minimumScaleFactor(0.8)
                Text(first.fraction).font(poppins("SemiBold", 12)).foregroundColor(FG).lineLimit(1)
              }
            }
            Text("\(weekdayShort(first.date)), \(dayMonth(first.date))")
              .font(poppins("Medium", 10)).foregroundColor(FG).opacity(0.6)
          } else {
            // ŚREDNI: hero najbliższego po lewej, lista kolejnych po prawej
            HStack(alignment: .top, spacing: 12) {
              VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 8) {
                  FractionBadge(fraction: first.fraction, size: 34)
                  VStack(alignment: .leading, spacing: 0) {
                    Text(heroWhen(first.date))
                      .font(poppins("Bold", 20)).foregroundColor(ACCENT)
                      .lineLimit(1).minimumScaleFactor(0.8)
                    Text(first.fraction).font(poppins("SemiBold", 12)).foregroundColor(FG).lineLimit(1)
                  }
                }
                Text("\(weekdayShort(first.date)), \(dayMonth(first.date))")
                  .font(poppins("Medium", 10)).foregroundColor(FG).opacity(0.6)
              }
              .frame(maxWidth: .infinity, alignment: .leading)

              if items.count > 1 {
                let rest = Array(items.dropFirst().prefix(3))
                VStack(alignment: .leading, spacing: 5) {
                  Text("KOLEJNE")
                    .font(poppins("SemiBold", 8)).foregroundColor(FG).opacity(0.5).kerning(1)
                  ForEach(rest.indices, id: \.self) { i in
                    UpcomingRow(item: rest[i])
                  }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
              }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
          }
        } else {
          EmptyState(systemImage: "mappin.slash", text: "Ustaw adres w apce")
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
    .widgetURL(URL(string: "kaszuby24://waste"))
  }
}
struct OdpadyWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "Odpady", provider: WasteProvider()) { WasteEntryView(entry: $0) }
      .configurationDisplayName("Wywóz odpadów")
      .description("Najbliższy termin wywozu odpadów.")
      .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Najbliższe wydarzenia
struct EventsEntry: TimelineEntry { let date: Date; let events: [WEvent] }
struct EventsProvider: TimelineProvider {
  func placeholder(in c: Context) -> EventsEntry { EventsEntry(date: Date(), events: []) }
  func getSnapshot(in c: Context, completion: @escaping (EventsEntry) -> Void) { completion(EventsEntry(date: Date(), events: loadJSON(K_EVENTS, [WEvent].self) ?? [])) }
  func getTimeline(in c: Context, completion: @escaping (Timeline<EventsEntry>) -> Void) {
    let next = Calendar.current.date(byAdding: .hour, value: 2, to: Date()) ?? Date().addingTimeInterval(7200)
    completion(Timeline(entries: [EventsEntry(date: Date(), events: loadJSON(K_EVENTS, [WEvent].self) ?? [])], policy: .after(next)))
  }
}
/** Biały kafelek kalendarza: skrót dnia + numer. */
private struct CalendarTile: View {
  var date: String
  var size: CGFloat = 40
  var body: some View {
    VStack(spacing: 0) {
      Text(weekdayShort(date).uppercased())
        .font(poppins("Bold", size * 0.2)).foregroundColor(Color(hexString: "#D6452D", fallback: .red))
      Text(dayNumber(date))
        .font(poppins("Bold", size * 0.45)).foregroundColor(BRAND.darker())
    }
    .frame(width: size, height: size)
    .background(RoundedRectangle(cornerRadius: size * 0.25).fill(FG))
  }
}

private func dayNumber(_ s: String) -> String {
  guard let d = parseISO(s) else { return "" }
  let f = DateFormatter(); f.locale = Locale(identifier: "pl_PL"); f.timeZone = TimeZone(identifier: "Europe/Warsaw"); f.dateFormat = "d"
  return f.string(from: d)
}

private func eventHour(_ s: String) -> String? {
  guard let d = parseISO(s) else { return nil }
  let f = DateFormatter(); f.locale = Locale(identifier: "pl_PL"); f.timeZone = TimeZone(identifier: "Europe/Warsaw"); f.dateFormat = "HH:mm"
  let out = f.string(from: d)
  return out == "00:00" ? nil : out
}

struct EventsEntryView: View {
  var entry: EventsEntry
  @Environment(\.widgetFamily) var family
  var body: some View {
    BrandBackground(family: family) {
      VStack(alignment: .leading, spacing: family == .systemLarge ? 8 : 6) {
        BrandHeader(label: family == .systemLarge ? "Wydarzenia w okolicy" : "Najbliższe w okolicy")
        if entry.events.isEmpty {
          EmptyState(systemImage: "calendar", text: "Brak wydarzeń")
        } else if family == .systemSmall {
          // MAŁY: kafelek kalendarza + tytuł najbliższego wydarzenia
          let first = entry.events[0]
          Spacer(minLength: 0)
          HStack(alignment: .center, spacing: 8) {
            CalendarTile(date: first.startsAt, size: 38)
            Text(cleanTitle(first.title)).font(poppins("SemiBold", 11)).foregroundColor(FG).lineLimit(3)
          }
          Text([weekdayFull(first.startsAt).lowercased(), first.location].compactMap { $0 }.joined(separator: " · "))
            .font(poppins("Medium", 9)).foregroundColor(FG).opacity(0.6).lineLimit(1)
        } else if family == .systemMedium {
          // ŚREDNI: hero najbliższego + KOLEJNE po prawej
          let first = entry.events[0]
          let rest = Array(entry.events.dropFirst().prefix(2))
          HStack(alignment: .top, spacing: 12) {
            HStack(alignment: .center, spacing: 8) {
              CalendarTile(date: first.startsAt, size: 40)
              VStack(alignment: .leading, spacing: 2) {
                Text(cleanTitle(first.title)).font(poppins("SemiBold", 12)).foregroundColor(FG).lineLimit(2)
                Text([eventHour(first.startsAt), first.location].compactMap { $0 }.joined(separator: " · "))
                  .font(poppins("Medium", 10)).foregroundColor(FG).opacity(0.6).lineLimit(1)
              }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if !rest.isEmpty {
              VStack(alignment: .leading, spacing: 6) {
                Text("KOLEJNE").font(poppins("SemiBold", 8)).foregroundColor(FG).opacity(0.5).kerning(1)
                ForEach(rest.indices, id: \.self) { i in
                  HStack(spacing: 6) {
                    CalendarTile(date: rest[i].startsAt, size: 24)
                    Text(cleanTitle(rest[i].title)).font(poppins("Medium", 10)).foregroundColor(FG).opacity(0.9).lineLimit(2)
                  }
                }
              }
              .frame(maxWidth: .infinity, alignment: .leading)
            }
          }
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        } else {
          // DUŻY: lista z kafelkami kalendarza
          let rows = Array(entry.events.prefix(5))
          ForEach(rows.indices, id: \.self) { i in
            HStack(alignment: .center, spacing: 10) {
              CalendarTile(date: rows[i].startsAt, size: 34)
              VStack(alignment: .leading, spacing: 1) {
                Text(cleanTitle(rows[i].title)).font(poppins("SemiBold", 12)).foregroundColor(FG).lineLimit(2)
                Text([eventHour(rows[i].startsAt), rows[i].location].compactMap { $0 }.joined(separator: " · "))
                  .font(poppins("Medium", 10)).foregroundColor(FG).opacity(0.6).lineLimit(1)
              }
              Spacer(minLength: 0)
            }
          }
          Spacer(minLength: 0)
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
    .widgetURL(URL(string: "kaszuby24://home"))
  }
}
struct WydarzeniaWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "Wydarzenia", provider: EventsProvider()) { EventsEntryView(entry: $0) }
      .configurationDisplayName("Najbliższe wydarzenia")
      .description("Nadchodzące wydarzenia w regionie.")
      .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

// MARK: - Najnowsze artykuły (konfigurowalny, self-fetch) — iOS 17+
@available(iOS 17.0, *)
struct ArtykulyEntry: TimelineEntry { let date: Date; let posts: [WPost]; let label: String }

@available(iOS 17.0, *)
struct ArtykulyProvider: AppIntentTimelineProvider {
  func placeholder(in c: Context) -> ArtykulyEntry { ArtykulyEntry(date: Date(), posts: loadJSON(K_POSTS, [WPost].self) ?? [], label: "Najnowsze") }

  func snapshot(for configuration: ArtykulyIntent, in c: Context) async -> ArtykulyEntry {
    await entry(for: configuration)
  }

  func timeline(for configuration: ArtykulyIntent, in c: Context) async -> Timeline<ArtykulyEntry> {
    let e = await entry(for: configuration)
    let ok = !e.posts.isEmpty
    let mins = ok ? 30 : 5
    let next = Calendar.current.date(byAdding: .minute, value: mins, to: Date()) ?? Date().addingTimeInterval(1800)
    return Timeline(entries: [e], policy: .after(next))
  }

  private func entry(for cfg: ArtykulyIntent) async -> ArtykulyEntry {
    let label = cfg.dzial?.name ?? cfg.region?.name ?? "Najnowsze"
    let fetched = await NewsFetcher.fetch(regionId: cfg.region?.id, dzialId: cfg.dzial?.id)
    let base = fetched.isEmpty ? (loadJSON(K_POSTS, [WPost].self) ?? []) : fetched
    // WidgetKit nie renderuje AsyncImage — pobieramy miniatury tu i wstrzykujemy jako Data.
    let posts = await withThumbnails(base, limit: 4)
    return ArtykulyEntry(date: Date(), posts: posts, label: label)
  }
}

// Prefetch miniatur artykułów dla widżetu (WidgetKit wymaga gotowych danych obrazka).
private func withThumbnails(_ posts: [WPost], limit: Int) async -> [WPost] {
  var out: [WPost] = []
  for (i, p) in posts.enumerated() {
    if i < limit, let data = await loadThumbnail(p.imageUrl) {
      out.append(WPost(id: p.id, slug: p.slug, title: p.title, imageUrl: p.imageUrl, category: p.category, date: p.date, imageData: data))
    } else {
      out.append(p)
    }
  }
  return out
}

private func loadThumbnail(_ urlStr: String?) async -> Data? {
  guard let s = urlStr, let u = URL(string: s) else { return nil }
  do {
    var req = URLRequest(url: u)
    req.timeoutInterval = 10
    req.cachePolicy = .reloadIgnoringLocalCacheData
    let (data, resp) = try await URLSession.shared.data(for: req)
    guard let http = resp as? HTTPURLResponse, 200..<300 ~= http.statusCode,
          let img = UIImage(data: data) else { return nil }
    // Downscale — widżety mają twardy limit pamięci (~30 MB); wyświetlamy 46x46.
    let maxDim: CGFloat = 140
    let scale = min(maxDim / max(img.size.width, 1), maxDim / max(img.size.height, 1), 1)
    let newSize = CGSize(width: img.size.width * scale, height: img.size.height * scale)
    let rendered = UIGraphicsImageRenderer(size: newSize).image { _ in
      img.draw(in: CGRect(origin: .zero, size: newSize))
    }
    return rendered.jpegData(compressionQuality: 0.8)
  } catch {
    return nil
  }
}

// Self-fetch: WP endpoint posts-filtered (region/dzial), tolerancyjne dekodowanie.
enum NewsFetcher {
  private struct Rendered: Decodable { let rendered: String? }
  private struct Media: Decodable { let source_url: String? }
  private struct Embedded: Decodable { enum CodingKeys: String, CodingKey { case media = "wp:featuredmedia" }; let media: [Media]? }
  private struct RawPost: Decodable {
    let id: Int
    let slug: String?
    let date: String?
    let title: Rendered?
    let featured_media_url: String?
    let _embedded: Embedded?
  }
  private struct Filtered: Decodable { let posts: [RawPost]? }

  static func fetch(regionId: Int?, dzialId: Int?) async -> [WPost] {
    var comps = URLComponents(string: "https://kaszuby24.pl/wp-json/kaszuby24/v1/posts-filtered")!
    var items = [URLQueryItem(name: "page", value: "1"), URLQueryItem(name: "per_page", value: "5")]
    if let r = regionId { items.append(URLQueryItem(name: "region", value: String(r))) }
    if let d = dzialId { items.append(URLQueryItem(name: "dzial", value: String(d))) }
    comps.queryItems = items
    guard let url = comps.url else { return [] }
    var req = URLRequest(url: url)
    req.timeoutInterval = 15
    req.cachePolicy = .reloadIgnoringLocalCacheData
    do {
      let (data, resp) = try await URLSession.shared.data(for: req)
      guard let http = resp as? HTTPURLResponse, 200..<300 ~= http.statusCode else { return [] }
      let dec = JSONDecoder()
      let raws: [RawPost]
      if let f = try? dec.decode(Filtered.self, from: data), let p = f.posts { raws = p }
      else if let arr = try? dec.decode([RawPost].self, from: data) { raws = arr }
      else { return [] }
      return raws.map { r in
        WPost(
          id: r.id,
          slug: r.slug ?? String(r.id),
          title: cleanTitle(r.title?.rendered ?? ""),
          imageUrl: r.featured_media_url ?? r._embedded?.media?.first?.source_url,
          category: nil,
          date: r.date ?? ""
        )
      }
    } catch {
      return []
    }
  }
}

@available(iOS 17.0, *)
/** Żółta plakietka działu. */
private struct CategoryChip: View {
  var text: String
  var body: some View {
    Text(text.uppercased())
      .font(poppins("Bold", 8)).kerning(0.5)
      .foregroundColor(BRAND.darker())
      .padding(.horizontal, 8).padding(.vertical, 2)
      .background(Capsule().fill(ACCENT))
  }
}

struct ArtykulyEntryView: View {
  var entry: ArtykulyEntry
  @Environment(\.widgetFamily) var family
  var body: some View {
    if family == .systemSmall, let first = entry.posts.first, let d = first.imageData, let ui = UIImage(data: d) {
      // MAŁY: zdjęcie artykułu na całym tle + gradient + plakietka + tytuł
      photoCard(first, ui)
    } else if family == .systemMedium, let first = entry.posts.first {
      BrandBackground(family: family) {
        VStack(alignment: .leading, spacing: 6) {
          BrandHeader(label: entry.label)
          let rest = Array(entry.posts.dropFirst().prefix(2))
          HStack(alignment: .top, spacing: 10) {
            Link(destination: URL(string: "kaszuby24://article/\(first.slug)")!) {
              HStack(alignment: .top, spacing: 10) {
                if let d = first.imageData, let ui = UIImage(data: d) {
                  Image(uiImage: ui).resizable().aspectRatio(contentMode: .fill)
                    .frame(width: 82, height: 82).clipShape(RoundedRectangle(cornerRadius: 12))
                }
                VStack(alignment: .leading, spacing: 3) {
                  if let cat = first.category { CategoryChip(text: cat) }
                  Text(cleanTitle(first.title)).font(poppins("SemiBold", 12)).foregroundColor(FG).lineLimit(3)
                  Spacer(minLength: 0)
                  Text(timeAgo(first.date)).font(poppins("Medium", 9)).foregroundColor(FG).opacity(0.6)
                }
              }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if !rest.isEmpty {
              VStack(alignment: .leading, spacing: 7) {
                ForEach(rest.indices, id: \.self) { i in
                  Link(destination: URL(string: "kaszuby24://article/\(rest[i].slug)")!) {
                    Text(cleanTitle(rest[i].title))
                      .font(poppins("Medium", 10)).foregroundColor(FG).opacity(0.92).lineLimit(3)
                      .frame(maxWidth: .infinity, alignment: .leading)
                  }
                }
              }
              .padding(.leading, 10)
              .overlay(Rectangle().fill(FG.opacity(0.15)).frame(width: 1), alignment: .leading)
            }
          }
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      }
    } else {
      // DUŻY (i fallbacki bez zdjęcia): lista jak dotąd
      let rows = Array(entry.posts.prefix(family == .systemLarge ? 4 : 2))
      BrandBackground(family: family) {
        VStack(alignment: .leading, spacing: 8) {
          BrandHeader(label: entry.label)
          if rows.isEmpty {
            EmptyState(systemImage: "newspaper", text: "Brak artykułów")
          } else {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, p in
              Link(destination: URL(string: "kaszuby24://article/\(p.slug)")!) {
                HStack(alignment: .top, spacing: 8) {
                  if let d = p.imageData, let ui = UIImage(data: d) {
                    Image(uiImage: ui).resizable().aspectRatio(contentMode: .fill)
                      .frame(width: 46, height: 46).clipShape(RoundedRectangle(cornerRadius: 8))
                  } else if p.imageUrl != nil {
                    Color.white.opacity(0.15)
                      .frame(width: 46, height: 46).clipShape(RoundedRectangle(cornerRadius: 8))
                  }
                  VStack(alignment: .leading, spacing: 2) {
                    Text(cleanTitle(p.title)).font(poppins("SemiBold", 13)).foregroundColor(FG).lineLimit(2)
                    Text(timeAgo(p.date)).font(poppins("Medium", 10)).foregroundColor(FG).opacity(0.7).lineLimit(1)
                  }
                  Spacer()
                }
              }
            }
            Spacer(minLength: 0)
          }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      }
    }
  }

  /** Mały widget: zdjęcie pod całością (iOS17 containerBackground / iOS16 background). */
  @ViewBuilder
  private func photoCard(_ post: WPost, _ ui: UIImage) -> some View {
    let overlay = LinearGradient(
      colors: [Color.black.opacity(0.15), Color(hexString: "#0A142D", fallback: .black).opacity(0.92)],
      startPoint: .top, endPoint: .bottom
    )
    let content = VStack(alignment: .leading, spacing: 0) {
      BrandHeader(label: "")
      Spacer(minLength: 0)
      if let cat = post.category { CategoryChip(text: cat) }
      Text(cleanTitle(post.title))
        .font(poppins("SemiBold", 11.5)).foregroundColor(FG).lineLimit(3)
        .padding(.top, 4)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)

    if #available(iOS 17.0, *) {
      content.padding(12).containerBackground(for: .widget) {
        ZStack { Image(uiImage: ui).resizable().aspectRatio(contentMode: .fill); overlay }
      }
      .widgetURL(URL(string: "kaszuby24://article/\(post.slug)"))
    } else {
      content.padding(12)
        .background(ZStack { Image(uiImage: ui).resizable().aspectRatio(contentMode: .fill); overlay })
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .widgetURL(URL(string: "kaszuby24://article/\(post.slug)"))
    }
  }
}

@available(iOS 17.0, *)
struct ArtykulyWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: "Artykuly", intent: ArtykulyIntent.self, provider: ArtykulyProvider()) { ArtykulyEntryView(entry: $0) }
      .configurationDisplayName("Najnowsze artykuły")
      .description("Artykuły z wybranego powiatu i działu. Przytrzymaj, aby wybrać.")
      .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

// MARK: - Bundle (WSZYSTKIE widgety wypisane ręcznie — plugin nie auto-rejestruje)
@main
struct Kaszuby24Widgets: WidgetBundle {
  var body: some Widget {
    PogodaWidget()
    PowietrzeWidget()
    OdpadyWidget()
    WydarzeniaWidget()
    if #available(iOS 17.0, *) {
      ArtykulyWidget()
    }
  }
}
