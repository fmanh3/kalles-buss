import os
from pathlib import Path

def concat_md_for_llm(source_dir, output_file="combined_context.txt"):
    base_path = Path(source_dir)
    
    if not base_path.is_dir():
        print(f"Fel: '{source_dir}' är inte en giltig mapp.")
        return

    # Letar rekursivt upp alla .md-filer
    md_files = list(base_path.rglob("*.md"))
    
    if not md_files:
        print("Hittade inga markdown-filer i mappen.")
        return

    with open(output_file, "w", encoding="utf-8") as out:
        for file_path in md_files:
            try:
                # Läs in innehållet
                content = file_path.read_text(encoding="utf-8")
                # Skapa en relativ sökväg för att hålla koll på strukturen
                rel_path = file_path.relative_to(base_path)
                
                # Tydlig avgränsning som är perfekt för AI-parsnig
                out.write(f'<file path="{rel_path}">\n')
                out.write(content)
                # Säkerställ att filen stängs med en ny rad ifall markdown-filen saknar det
                out.write("\n</file>\n\n")
                
            except Exception as e:
                print(f"Kunde inte läsa {file_path}: {e}")
                
    print(f"Klart! {len(md_files)} filer slogs ihop och sparades i '{output_file}'.")

if __name__ == "__main__":
    mapp = input("Ange sökväg till mappen med dina .md-filer (t.ex. ./docs): ")
    concat_md_for_llm(mapp)
