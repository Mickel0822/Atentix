from PyPDF2 import PdfReader

reader = PdfReader(r'c:\detecion_atencion\requisitos_detecion.pdf')
with open('pdf_content.txt', 'w', encoding='utf-8') as f:
    for i, page in enumerate(reader.pages):
        f.write(f"--- Page {i+1} ---\n")
        f.write(page.extract_text() or "")
        f.write("\n\n")
print("Done! Check pdf_content.txt")
