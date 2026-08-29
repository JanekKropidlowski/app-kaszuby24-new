import AppIntents
import Foundation

// MUSI być w _shared/ — @bacons/apple-targets kompiluje ten plik i do rozszerzenia widgetu,
// i do głównej apki (wymóg rejestracji App Intents). App Group musi zgadzać się z app.json.
let INTENT_APP_GROUP = "group.app.kaszuby24"
let DICTS_KEY = "kaszuby24.widget.dicts"

// Model słownika zapisanego przez apkę (lib/widget-sync → WidgetDicts).
private struct DictEntry: Decodable { let id: Int; let name: String }
private struct DictsPayload: Decodable { let regions: [DictEntry]; let dzialy: [DictEntry] }

private func loadDicts() -> DictsPayload? {
  guard let defaults = UserDefaults(suiteName: INTENT_APP_GROUP),
        let str = defaults.string(forKey: DICTS_KEY),
        let data = str.data(using: .utf8) else { return nil }
  return try? JSONDecoder().decode(DictsPayload.self, from: data)
}

// MARK: - Powiat (region)
@available(iOS 17.0, *)
struct RegionEntity: AppEntity {
  let id: Int
  let name: String

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Powiat")
  var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }
  static var defaultQuery = RegionQuery()
}

@available(iOS 17.0, *)
struct RegionQuery: EntityQuery {
  func suggestedEntities() async throws -> [RegionEntity] {
    (loadDicts()?.regions ?? []).map { RegionEntity(id: $0.id, name: $0.name) }
  }
  func entities(for identifiers: [Int]) async throws -> [RegionEntity] {
    try await suggestedEntities().filter { identifiers.contains($0.id) }
  }
}

// MARK: - Dział (kategoria)
@available(iOS 17.0, *)
struct CategoryEntity: AppEntity {
  let id: Int
  let name: String

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Dział")
  var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }
  static var defaultQuery = CategoryQuery()
}

@available(iOS 17.0, *)
struct CategoryQuery: EntityQuery {
  func suggestedEntities() async throws -> [CategoryEntity] {
    (loadDicts()?.dzialy ?? []).map { CategoryEntity(id: $0.id, name: $0.name) }
  }
  func entities(for identifiers: [Int]) async throws -> [CategoryEntity] {
    try await suggestedEntities().filter { identifiers.contains($0.id) }
  }
}

// MARK: - Konfiguracja widgetu artykułów (arkusz Edit)
@available(iOS 17.0, *)
struct ArtykulyIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Artykuły"
  static var description = IntentDescription("Wybierz powiat i dział wyświetlanych artykułów.")

  @Parameter(title: "Powiat")
  var region: RegionEntity?

  @Parameter(title: "Dział")
  var dzial: CategoryEntity?

  func perform() async throws -> some IntentResult {
    return .result()
  }
}
