# CLAUDE.md - AramCRM 프로젝트 규칙

## Git 자동 커밋/푸시 규칙

- 코드를 변경할 때마다 자동으로 `git add`, `git commit`, `git push`를 수행한다
- 커밋 메시지는 **한글**로 변경 내용을 자세히 작성한다
- 브랜치는 **main**을 사용한다
- 원격 저장소: `https://github.com/infohyun/aramcrm.git`
- 중요한 변경사항에는 버전 태그(v1.0, v1.1 등)를 부여한다

## 커밋 메시지 형식

```
[카테고리] 변경 내용 요약

- 상세 변경사항 1
- 상세 변경사항 2

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### 카테고리 예시
- `[기능]` - 새로운 기능 추가
- `[수정]` - 버그 수정
- `[개선]` - 기존 기능 개선/리팩토링
- `[스타일]` - UI/디자인 변경
- `[설정]` - 설정 파일 변경
- `[문서]` - 문서 수정
