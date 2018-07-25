from collections import defaultdict
import os
import re

def extract_from_sources():
    re_trans_msg = re.compile("""_\(\s*(?P<phrase>("[^"]*")|('[^']*'))\s*\)""")
    phrases = defaultdict(lambda: defaultdict(list))
    for src_file in os.listdir("../src"):
        if os.path.splitext(src_file)[1] == ".js":
            fname = os.path.join("../src", src_file)
            for i, line in enumerate(open(fname)):
                for mo in re_trans_msg.finditer(line):
                    phrase = mo.group("phrase")[1:-1].replace('"', r'\"')
                    phrases[phrase][src_file].append(i + 1)
    return phrases


def output_phrases(fname, phrases, translations=None):
    def compare_wheres(wheres):
        swheres = sorted(wheres[1])
        return [swheres, sorted(wheres[1][swheres[0]])]

    translations = translations or {}
    outf = open(fname, "wt")
    outf.write("export const translations = {\n")
    outf.write(
        "\n\n".join('{}\n    "{}": {},'.format(
            "\n".join("    // {}:{}".format(src, ",".join(str(line) for line in lines))
                      for src, lines in sorted(where.items())),
            what,
            '"{}"'.format(translations[what]) if what in translations else "null")
            for what, where in sorted(phrases.items(), key=compare_wheres)))

    unused = [(phrase, translation)
              for phrase, translation in translations.items()
              if phrase not in phrases]
    if unused:
        outf.write("\n\n    // Unused translations\n")
        outf.write("".join('    "{}": "{}"'.format(phrase, translation)
                             for phrase, translation in unused))
        outf.write("\n")

    outf.write("\n}")

def update_translations(fname):
    translation = open(fname).read()
    open(fname + ".bak", "wt").write(translation)
    translation = translation[translation.index("{"):translation.rindex("}") + 1].replace("//", "#")
    translations = eval(translation, {"null": None})
    translations = {key: value for key, value in translations.items() if value is not None}
    output_phrases(fname, phrases, translations)


phrases = extract_from_sources()

output_phrases("template.js", phrases)
update_translations("slovenian.js")