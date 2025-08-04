import pandas as pd

# CSV 파일 읽기
df = pd.read_csv("MetObjects_small.csv")

# 제외할 부서 목록
exclude_departments = ["The Cloisters", "Robert Lehman Collection", "The Libraries", "Musical Instruments"]

# 제외 조건 적용
filtered_df = df[~df["Department"].isin(exclude_departments)]

# 새 CSV 파일로 저장
filtered_df.to_csv("MetObjects_filtered.csv", index=False)

print("필터링된 CSV 파일이 저장되었습니다.")
