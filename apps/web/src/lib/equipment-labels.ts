/**
 * Maps English equipment enum codes → Korean display labels.
 * Equipment is stored as free-text in the DB; this map handles any
 * legacy seed data that was saved in English enum format.
 */
const EQUIPMENT_LABEL_MAP: Record<string, string> = {
  // 중장비
  EXCAVATOR: "굴삭기",
  CRANE: "크레인",
  BULLDOZER: "불도저",
  FORKLIFT: "지게차",
  CONCRETE_PUMP: "콘크리트 펌프",
  ROLLER: "롤러",
  TOWER_CRANE: "타워크레인",
  // 차량
  DUMP_TRUCK: "덤프트럭",
  MIXER_TRUCK: "레미콘트럭",
  CHERRY_PICKER: "고소작업차",
  // 공구
  WELDING_MACHINE: "용접기",
  GRINDER: "그라인더",
  DRILL: "드릴",
  COMPRESSOR: "콤프레셔",
  // 자재
  SCAFFOLDING: "비계자재",
  // 안전/개인 장비
  SAFETY_HARNESS: "안전 하네스",
  HARD_HAT: "안전모",
  ELECTRICAL_TESTER: "전기 테스터",
  MULTIMETER: "멀티미터",
  LADDER: "사다리",
  SPRAY_MACHINE: "스프레이 건",
  TILE_CUTTER: "타일 커터",
  REBAR_BENDER: "철근 절곡기",
  PIPE_WRENCH: "파이프 렌치",
  FORM_JACK: "폼 잭",
  CRANE_OPERATOR_LICENSE: "크레인 운전 자격",
}

/**
 * Returns a Korean display label for an equipment string.
 * Falls back to the original string if no mapping exists.
 */
export function equipmentLabel(code: string): string {
  return EQUIPMENT_LABEL_MAP[code] ?? code
}
