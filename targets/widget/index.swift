import WidgetKit
import SwiftUI
import AppIntents

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
struct WWeather: Decodable { let tempC: Double; let icon: String; let desc: String; let city: String; let hi: Double?; let lo: Double? }
struct WAir: Decodable { let index: Int?; let category: String?; let color: String; let city: String }
struct WWasteItem: Decodable { let date: String; let fraction: String }
struct WWaste: Decodable { let empty: Bool; let gmina: String?; let next: [WWasteItem]?; let reason: String? }
struct WPost: Decodable { let id: Int; let slug: String; let title: String; let imageUrl: String?; let category: String?; let date: String }
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
        VStack(alignment: .leading, spacing: 4) {
          BrandHeader(label: w?.city ?? "Pogoda")
          if let w = w {
            HStack(spacing: 8) {
              Image(systemName: owmSymbol(w.icon)).font(.system(size: family == .systemSmall ? 30 : 34)).foregroundColor(FG)
              Text("\(Int(w.tempC))°").font(poppins("Bold", family == .systemSmall ? 34 : 40)).foregroundColor(FG)
            }
            Text(w.desc).font(poppins("Medium", 12)).foregroundColor(FG).opacity(0.85).lineLimit(1)
            if let hi = w.hi, let lo = w.lo {
              Text("↑\(Int(hi))°  ↓\(Int(lo))°").font(poppins("SemiBold", 12)).foregroundColor(ACCENT)
            }
            SourceCaption(text: "Źródło: Open-Meteo")
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
          if let a = a, let cat = a.category {
            HStack(spacing: 8) {
              Circle().fill(Color(hexString: a.color, fallback: .gray)).frame(width: 12, height: 12)
              Text(cat).font(poppins("Bold", 18)).foregroundColor(FG).lineLimit(1)
            }
            Text("Jakość powietrza").font(poppins("Medium", 11)).foregroundColor(FG).opacity(0.75)
            SourceCaption(text: "Źródło: Open-Meteo")
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
struct PowietrzeWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "Powietrze", provider: AirProvider()) { AirEntryView(entry: $0) }
      .configurationDisplayName("Jakość powietrza")
      .description("Indeks jakości powietrza w Twojej okolicy.")
      .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryInline])
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
struct WasteEntryView: View {
  var entry: WasteEntry
  @Environment(\.widgetFamily) var family
  var body: some View {
    let waste = entry.waste
    BrandBackground(family: family) {
      VStack(alignment: .leading, spacing: 4) {
        BrandHeader(label: (waste != nil && !waste!.empty) ? (waste!.gmina ?? "Odpady") : "Odpady")
        if let waste = waste, !waste.empty, let items = waste.next, let first = items.first {
          Text(dayMonth(first.date)).font(poppins("Bold", 22)).foregroundColor(ACCENT)
          Text(first.fraction).font(poppins("SemiBold", 13)).foregroundColor(FG).lineLimit(2)
          if family != .systemSmall, items.count > 1 {
            Text("Potem \(dayMonth(items[1].date)) · \(items[1].fraction)").font(poppins("Medium", 11)).foregroundColor(FG).opacity(0.75).lineLimit(1)
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
struct EventsEntryView: View {
  var entry: EventsEntry
  @Environment(\.widgetFamily) var family
  var body: some View {
    let rows = Array(entry.events.prefix(family == .systemLarge ? 5 : 3))
    BrandBackground(family: family) {
      VStack(alignment: .leading, spacing: 8) {
        BrandHeader(label: "Wydarzenia")
        if rows.isEmpty {
          EmptyState(systemImage: "calendar", text: "Brak wydarzeń")
        } else {
          ForEach(Array(rows.enumerated()), id: \.offset) { _, e in
            HStack(alignment: .top, spacing: 10) {
              Text(dayMonth(e.startsAt)).font(poppins("Bold", 14)).foregroundColor(ACCENT).frame(width: 44, alignment: .leading)
              VStack(alignment: .leading, spacing: 1) {
                Text(e.title).font(poppins("SemiBold", 13)).foregroundColor(FG).lineLimit(2)
                if let loc = e.location { Text(loc).font(poppins("Medium", 10)).foregroundColor(FG).opacity(0.7).lineLimit(1) }
              }
              Spacer()
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
      .supportedFamilies([.systemMedium, .systemLarge])
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
    let posts = fetched.isEmpty ? (loadJSON(K_POSTS, [WPost].self) ?? []) : fetched
    return ArtykulyEntry(date: Date(), posts: posts, label: label)
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
struct ArtykulyEntryView: View {
  var entry: ArtykulyEntry
  @Environment(\.widgetFamily) var family
  var body: some View {
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
                if let img = p.imageUrl, let u = URL(string: img) {
                  AsyncImage(url: u) { phase in
                    if let image = phase.image { image.resizable().aspectRatio(contentMode: .fill) }
                    else { Color.white.opacity(0.15) }
                  }
                  .frame(width: 46, height: 46).clipShape(RoundedRectangle(cornerRadius: 8))
                }
                VStack(alignment: .leading, spacing: 2) {
                  Text(p.title).font(poppins("SemiBold", 13)).foregroundColor(FG).lineLimit(2)
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

@available(iOS 17.0, *)
struct ArtykulyWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: "Artykuly", intent: ArtykulyIntent.self, provider: ArtykulyProvider()) { ArtykulyEntryView(entry: $0) }
      .configurationDisplayName("Najnowsze artykuły")
      .description("Artykuły z wybranego powiatu i działu. Przytrzymaj, aby wybrać.")
      .supportedFamilies([.systemMedium, .systemLarge])
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
