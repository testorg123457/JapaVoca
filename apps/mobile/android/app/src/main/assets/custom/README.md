# Pretendard 폰트 (사용자 추가 필요)

토스st 디자인 시스템은 **Pretendard** 폰트를 사용합니다. 이 폴더에 아래 파일들을 넣으세요.

```
assets/fonts/
├── Pretendard-Regular.ttf
├── Pretendard-Medium.ttf
├── Pretendard-SemiBold.ttf
└── Pretendard-Bold.ttf
```

- 다운로드: https://github.com/orioncactus/pretendard (Open Font License)
- `tokens.ts`의 `fontFamily` 값(`Pretendard-Regular` 등)이 파일의 PostScript 이름과
  일치해야 합니다.

## 링크 방법

폰트 파일을 넣은 뒤 프로젝트 루트(`apps/mobile`)에서:

```bash
npx react-native-asset
```

그러면 `react-native.config.js`의 `assets` 경로를 읽어 Android(`res/font` 또는
`assets/fonts`)에 폰트가 복사/등록됩니다. 이후 `npx react-native run-android`로 재빌드.

> 폰트를 아직 넣지 않았다면 텍스트는 시스템 기본 폰트로 폴백되어 표시됩니다.
> (앱은 정상 동작하며, 룩만 Pretendard 적용 전 상태)
