import io
import re
from typing import Dict, Any, List, Optional
from pypdf import PdfReader
from docx import Document

class ResumeParser:
    # Requesting this name with empty bytes yields the built-in demo resume.
    SAMPLE_FILENAME = "sample_resume.pdf"

    @staticmethod
    def extract_text_from_pdf(file_bytes: bytes) -> str:
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            return text.strip()
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(
                "That PDF could not be opened. It may be corrupted or password protected. "
                f"Try re-exporting it, or paste the text instead. ({type(e).__name__})"
            )

    # Legacy Word documents are OLE compound files; python-docx only reads the
    # zip-based .docx format, so they are rejected with a message that says so.
    _OLE_MAGIC = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"

    @classmethod
    def extract_text_from_docx(cls, file_bytes: bytes) -> str:
        if file_bytes.startswith(cls._OLE_MAGIC):
            raise ValueError(
                "That is a legacy Word (.doc) file, which cannot be read. "
                "Open it in Word and save as .docx or PDF, then try again."
            )
        try:
            doc = Document(io.BytesIO(file_bytes))
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs if paragraph.text])
            # Also extract text from tables
            for table in doc.tables:
                for row in table.rows:
                    text += "\n" + " | ".join([cell.text.strip() for cell in row.cells if cell.text.strip()])
            return text.strip()
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(
                "That Word file could not be read. Make sure it is a real .docx, "
                f"or save it as a PDF and try again. ({type(e).__name__})"
            )

    @staticmethod
    def extract_text_from_txt(file_bytes: bytes) -> str:
        try:
            return file_bytes.decode("utf-8", errors="replace").strip()
        except Exception as e:
            raise ValueError(f"Failed to parse text file: {str(e)}")

    @classmethod
    def parse_file(cls, filename: str, file_bytes: bytes) -> Dict[str, Any]:
        lower_name = filename.lower()
        if filename == cls.SAMPLE_FILENAME and not file_bytes:
            raw_text = ""  # falls through to the built-in demo resume below
        elif lower_name.endswith(".pdf"):
            raw_text = cls.extract_text_from_pdf(file_bytes)
        elif lower_name.endswith(".docx") or lower_name.endswith(".doc"):
            raw_text = cls.extract_text_from_docx(file_bytes)
        elif lower_name.endswith(".txt") or lower_name.endswith(".md"):
            raw_text = cls.extract_text_from_txt(file_bytes)
        else:
            # Fallback to UTF-8 decoding
            raw_text = cls.extract_text_from_txt(file_bytes)

        if not raw_text or len(raw_text.strip()) < 20:
            if filename != cls.SAMPLE_FILENAME:
                raise ValueError(
                    "Could not extract any readable text from that file. "
                    "If it is a scanned image, paste the text instead."
                )
            raw_text = (
                "John Doe - Aspiring Results-Oriented Professional\n"
                "Email: john.doe@example.com | Phone: 555-0199\n\n"
                "Professional Summary:\n"
                "Hardworking and results-driven team player with deep passion for synergizing cross-functional deliverables.\n\n"
                "Skills:\n"
                "Microsoft Word, Excel, PowerPoint, Communication, Problem Solving, HTML, Python, Leadership\n\n"
                "Experience:\n"
                "Software Intern - Tech Corp (2024 - 2025)\n"
                "- Responsible for writing code and attending daily standups.\n"
                "- Helped team members with various technical assignments.\n"
                "- Demonstrated strong commitment to excellence.\n\n"
                "Education:\n"
                "B.S. in Computer Science - University of Knowledge (2021 - 2025)\n"
                "GPA: 3.4/4.0"
            )

        structured_sections = cls.split_sections(raw_text)
        analysis_metrics = cls.analyze_raw_metrics(raw_text)

        return {
            "raw_text": raw_text,
            "sections": structured_sections,
            "metrics": analysis_metrics,
            "word_count": len(raw_text.split()),
            "character_count": len(raw_text)
        }

    @staticmethod
    def split_sections(text: str) -> Dict[str, str]:
        sections: Dict[str, str] = {
            "summary": "",
            "experience": "",
            "skills": "",
            "education": "",
            "projects": "",
            "other": ""
        }

        # Common headers pattern
        header_patterns = {
            "summary": r"(?:summary|professional summary|about me|profile|objective)",
            "experience": r"(?:experience|work experience|employment history|work history|professional experience)",
            "skills": r"(?:skills|technical skills|core competencies|technologies|tools)",
            "education": r"(?:education|academic background|qualifications)",
            "projects": r"(?:projects|personal projects|key projects|academic projects)"
        }

        lines = text.splitlines()
        current_section = "other"
        current_lines: List[str] = []

        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue

            detected_header = None
            if len(stripped) < 40:
                for sec, pattern in header_patterns.items():
                    if re.search(r"^#*\s*" + pattern + r"[:\s]*$", stripped, re.IGNORECASE):
                        detected_header = sec
                        break

            if detected_header:
                if current_lines:
                    sections[current_section] = (sections[current_section] + "\n" + "\n".join(current_lines)).strip()
                    current_lines = []
                current_section = detected_header
            else:
                current_lines.append(stripped)

        if current_lines:
            sections[current_section] = (sections[current_section] + "\n" + "\n".join(current_lines)).strip()

        return sections

    @staticmethod
    def analyze_raw_metrics(text: str) -> Dict[str, Any]:
        words = text.split()
        total_words = len(words)
        
        # Detect buzzwords
        buzzwords = [
            "results-driven", "synergy", "hardworking", "team player", "passionate",
            "self-starter", "go-getter", "out-of-the-box", "detail-oriented",
            "thought leadership", "leverage", "dynamic", "strategic thinker",
            "responsible for", "helped", "assisted", "worked on"
        ]
        found_buzzwords = [bw for bw in buzzwords if re.search(r"\b" + re.escape(bw) + r"\b", text, re.IGNORECASE)]

        # Detect numbers / metrics (e.g. 50%, $10k, 100k, 2x, 400+)
        metrics_found = re.findall(r"(\d+(?:\.\d+)?%|\$\d+(?:,\d+)*(?:\.\d+)?[kmbKMB]?|\b\d+\s*(?:users|clients|requests|ms|seconds|x|million|k)\b)", text, re.IGNORECASE)

        # Detect action verbs
        # Achievement verbs. This list must stay in step with the verbs the rewriter
        # promotes weak bullets into, otherwise applying our own advice fails to score.
        strong_verbs = [
            "architected", "spearheaded", "engineered", "optimized", "orchestrated",
            "automated", "reduced", "scaled", "delivered", "transformed", "boosted",
            "built", "wrote", "owned", "drove", "led", "launched", "shipped", "designed",
            "developed", "created", "implemented", "improved", "increased", "decreased",
            "cut", "saved", "grew", "streamlined", "resolved", "maintained", "supported",
            "managed", "coordinated", "mentored", "trained", "analyzed", "tested",
            "deployed", "migrated", "refactored", "negotiated", "secured", "established",
            "introduced", "consolidated", "eliminated", "accelerated", "expanded",
            "ensured", "documented", "tracked", "planned", "conducted", "performed",
            "contributed", "partnered", "championed", "pioneered", "produced", "ran",
        ]
        found_strong_verbs = [v for v in strong_verbs if re.search(r"\b" + re.escape(v) + r"\b", text, re.IGNORECASE)]

        return {
            "total_words": total_words,
            "buzzword_count": len(found_buzzwords),
            "buzzwords": found_buzzwords,
            "metrics_count": len(metrics_found),
            "metrics": metrics_found,
            "strong_verbs_count": len(found_strong_verbs),
            "strong_verbs": found_strong_verbs
        }
