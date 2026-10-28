import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.citations import format_inline, format_bibliography, apply_template, extract_doc_text

def test_inline_styles():
    assert format_inline("WHO Report", "https://x", "p. 3", "apa", "2024") == "(WHO Report, 2024, p. 3)"
    assert format_inline("WHO Report", "https://x", "p. 3", "mla") == '("WHO Report", p. 3)'
    assert "WHO Report" in format_inline("WHO Report", "https://x", "", "chicago")

def test_bibliography_styles():
    assert "(2024)" in format_bibliography("WHO Report", "https://x", "", "apa", "WHO", "2024")
    assert "Accessed" in format_bibliography("WHO Report", "https://x", "", "mla", "WHO", "2024")
    assert "accessed" in format_bibliography("WHO Report", "https://x", "", "chicago", "WHO", "2024")

def test_templates():
    s = apply_template("support", "(WHO 2024)", "latency fell", "down 40%")
    assert "(WHO 2024)" in s and "latency fell" in s

def test_docx_extract():
    import io, zipfile
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("word/document.xml",
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            '<w:p><w:r><w:t>Hello world</w:t></w:r></w:p></w:document>')
    assert "Hello world" in extract_doc_text("a.docx", buf.getvalue())

def test_csv_extract():
    assert "a,b" in extract_doc_text("d.csv", b"a,b\n1,2")
