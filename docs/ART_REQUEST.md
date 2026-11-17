# 아트리스트 이미지 요청서

아트리스트에서 아래 프롬프트로 이미지를 만들어 채팅에 올려 주세요.
**배경 제거, 크기 조절, 게임 적용은 Claude가 합니다.** 파일 이름은 아무거나 괜찮고, 어떤 항목인지만 알려 주세요 (예: "A1 슬라임").

## 만들 때 규칙 (중요)

1. **참고 이미지 넣기**: 아트리스트에서 참고 이미지를 넣을 수 있다면 `docs/concept.png`(처음 보낸 그림)를 넣어 주세요. 그림체가 통일됩니다.
2. **배경은 단색**: 각 항목에 적힌 배경색(초록 `#00FF00`, 분홍 `#FF00FF`, 검정)을 지켜 주세요. 그래야 깨끗하게 지울 수 있어요.
3. **한 장에 하나만**: 대상 하나가 가운데에 전신으로 나오게. 바닥 그림자, 글자는 넣지 않습니다.
4. 마음에 드는 결과가 여러 장이면 **전부 올려 주셔도 됩니다**. 제가 게임에 넣어 보고 제일 잘 어울리는 걸 고를게요.

## 공통 스타일 문구

아래 문구를 **모든 프롬프트 뒤에 붙여 주세요.** 이게 그림체를 통일하는 핵심이에요. `[BG]` 자리에는 항목별 배경색을 넣습니다.

```
, isometric 2:1 perspective, 3/4 top-down view, high quality 16-bit pixel art, cute chibi Korean MMORPG style, clean dark outline, soft cel shading, bright pastel colors, single subject centered, full body, nothing else in the frame, no text, no ground shadow, plain solid flat [BG] background
```

- 초록 배경 → `[BG]` = `pure green (#00FF00)`
- 분홍 배경 → `[BG]` = `pure magenta (#FF00FF)`
- 검정 배경 → `[BG]` = `pure black`

---

## A. 몬스터 (1순위) — 비율 1:1

| 번호 | 대상 | 배경 | 프롬프트 (앞부분) |
|---|---|---|---|
| A1 | 야근 슬라임 | 초록 | `a tired purple slime monster with sleepy half-closed eyes, dark circles and a drop of drool, small coffee stain, office overtime theme` |
| A2 | 버그 벌레 | 분홍 | `a green beetle bug monster with glowing red eyes, yellow antennae and six small legs, a tiny red error "X" mark on its shell` |
| A3 | 결재 지연 유령 | 초록 | `a floating white bedsheet ghost with a sly face, holding an office document with a red rejection stamp` |
| A4 | 마감 골렘 (보스) | 초록 | `a giant boss golem made of stacked cardboard document boxes and paper piles, blue binder arms, glowing red eyes, a red headband, menacing but cute` |

공격 모습도 있으면 좋아요 (선택): 같은 프롬프트에 `, attacking pose, lunging forward` 를 붙여 A1-공격, A2-공격 처럼 올려 주세요.

## B. 플레이어 캐릭터 (5개 부서 + NPC) — 비율 3:4

각 부서마다 **앞모습, 뒷모습** 2장을 만들어 주세요. 참고 이미지로 처음 그림의 해당 캐릭터 카드를 넣으면 가장 좋아요.
- 앞모습: 프롬프트 뒤에 `, standing, facing the viewer diagonally (toward bottom-left)`
- 뒷모습: 프롬프트 뒤에 `, standing, seen from behind (facing toward top-right)`
- 공격 모습 (선택): 프롬프트 뒤에 `, attack pose, swinging toward bottom-left`

| 번호 | 부서 | 배경 | 프롬프트 (앞부분) |
|---|---|---|---|
| B1 | 공무팀 | 초록 | `a young office worker man with brown hair, navy blue suit and blue tie, holding a tan document folder` |
| B2 | 유지보수팀 | 분홍 | `a maintenance technician man in blue overalls and blue cap, tool belt, holding a big silver wrench` |
| B3 | 인사팀 | 초록 | `an HR office woman with long orange-brown hair, pink blouse, navy pencil skirt, holding a clipboard` |
| B4 | 재무팀 | 초록 | `a finance office man with black hair and glasses, white shirt, navy tie, holding a calculator and a brown briefcase` |
| B5 | EHS팀 | 분홍 | `a safety officer woman with long brown hair, white hard hat with green cross, neon yellow safety vest, green cargo pants, carrying a traffic cone` |
| B6 | NPC 박선임 | 초록 | `a senior office worker man with neat dark hair and glasses, gray suit, red tie, friendly smile` (앞모습만) |

## C. 맵 (지형 · 건물 · 소품)

### C-1. 바닥 텍스처 — 비율 1:1, 배경 없음
위에서 내려다본 **이어붙일 수 있는(seamless) 정사각형 텍스처**로 만들어 주세요. 쿼터뷰 다이아몬드 모양 변환은 제가 합니다.
이 항목은 공통 문구 대신 아래 문구를 붙여 주세요.
`, seamless tileable texture, straight top-down view, 16-bit pixel art, bright pastel colors, no objects`

| 번호 | 대상 | 프롬프트 (앞부분) |
|---|---|---|
| C1 | 잔디 | `fresh bright green grass with tiny flowers` |
| C2 | 광장 돌바닥 | `light lavender-gray cobblestone plaza pavement` |
| C3 | 흙길 | `light brown dirt path with small pebbles` |
| C4 | 사냥터 풀밭 | `darker deep green wild grass field` |
| C5 | 물 | `clear blue water surface with light sparkles` |

### C-2. 건물과 소품 — 공통 문구 사용

| 번호 | 대상 | 비율 | 배경 | 프롬프트 (앞부분) |
|---|---|---|---|---|
| C6 | HBC 본사 건물 | 16:9 | 분홍 | `a grand 3-story company headquarters building, cream stone walls, navy blue roof, central arched entrance with steps, golden sign board above the door, many blue windows, front facade facing bottom-left` |
| C7 | 나무 1 | 3:4 | 분홍 | `a round fluffy green deciduous tree` |
| C8 | 나무 2 | 3:4 | 초록 | `a round tree with pink blossom flowers` |
| C9 | 나무 3 | 3:4 | 분홍 | `a dark green pine tree` |
| C10 | 분수 | 1:1 | 분홍 | `a round white stone plaza fountain with blue water and a central water spout` |
| C11 | 가로등 | 3:4 | 초록 | `an elegant navy blue iron street lamp with a warm glowing lantern` |
| C12 | 벤치 | 1:1 | 초록 | `a wooden park bench with iron legs` |
| C13 | 화단 | 4:3 | 초록 | `a rectangular raised stone flower bed full of colorful flowers` |
| C14 | 바위 | 1:1 | 초록 | `a gray mossy boulder rock` |
| C15 | 울타리 | 4:3 | 초록 | `a short wooden fence segment with two posts, running diagonally` |

## D. 스킬 효과 — 비율 1:1, **검정 배경**

효과는 검정 배경으로 만들어야 빛나는 느낌으로 합성됩니다. 공통 문구 대신 아래 문구를 붙여 주세요.
`, game visual effect sprite, glowing, vivid, centered, plain solid pure black background, no character`

| 번호 | 대상 | 프롬프트 (앞부분) |
|---|---|---|
| D1 | 공무팀 돌진 베기 | `a sharp blue crescent sword slash arc with white core` |
| D2 | 유지보수팀 회오리 | `a blue whirlwind energy ring seen from above, swirling` |
| D3 | 인사팀 하트 | `a single glossy pink heart with sparkles` |
| D4 | 재무팀 서류 마법진 | `a purple magic circle with runes seen from above, flying paper sheets around it` |
| D5 | EHS팀 회복 | `a green healing aura ring with plus-shaped cross sparkles` |
| D6 | 타격 | `a bright white and yellow impact hit spark burst` |
| D7 | 보스 내려찍기 | `an orange ground shockwave crack burst seen from above` |

---

## 우선순위

1. **A 몬스터 4장**만 먼저 보내 주셔도 됩니다. 바로 적용해서 스크린샷으로 보여드릴게요.
2. 그다음 B 캐릭터 → C 맵 → D 효과 순서로 보내 주세요.
