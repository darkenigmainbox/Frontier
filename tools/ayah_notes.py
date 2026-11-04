#!/usr/bin/env python3
"""Attach per-āyah editorial notes to src/data/surah.json.

Every note is one of:
  {"type":"report", "text":..., "source":...}   a specific occasion / addressee, attributed
  {"type":"text",   "text":...}                 no occasion reported; what the wording itself does
  {"type":"disputed","text":...}                the reports conflict; both sides shown
  {"type":"caution","text":...}                 a report that exists but should not be relied on
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, "src", "data", "surah.json")

N = {}

N[1] = dict(type="text", title="The opening", text=(
    "No occasion of revelation is reported for this āyah. It opens the sūrah with the disjoint letters "
    "and then makes two claims in one sentence: these are the signs of the Book, and what has been sent "
    "down to you from your Lord is the truth. The second half is aimed at the reader who has already "
    "entertained the doubt."))

N[2] = dict(type="text", title="Who it addresses", text=(
    "The āyah addresses the Makkan listener directly: look up. The heavens have no pillars you can see, "
    "the sun and moon are running to a term, and the whole arrangement is being managed. Ibn Kathīr notes "
    "that the closing phrase — 'so that you may be certain of the meeting with your Lord' — ties the "
    "physical argument to the resurrection they were denying."))

N[3] = dict(type="text", title="The earth as a made thing", text=(
    "Mountains as pegs, rivers as cuts through the ground, fruit in pairs. Al-Mukhtaṣar glosses 'two of "
    "every fruit' as the paired kinds — and the classical readers also saw male and female in plants. "
    "The point is not botany; it is that nothing here is left undirected."))

N[4] = dict(type="text", title="The same water", text=(
    "Neighbouring plots of ground, vines, crops, palms sharing a root and palms standing alone — all "
    "watered by one water, and yet not equal in taste or yield. This is the sūrah's method in miniature: "
    "identical inputs, deliberately unlike outputs, and the difference is the sign."))

N[5] = dict(type="text", title="The addressee", text=(
    "'And if you are astonished — then astonishing is their saying.' The address here is to the Prophet ﷺ. "
    "The thing worth being astonished at is not the world; it is that a people who can see āyāt 2–4 still "
    "think being turned to dust is the impossible part."))

N[6] = dict(type="text", title="The demand for the punishment", text=(
    "They were asking for the punishment to be hurried. The āyah answers with history: settlements before "
    "them were destroyed for the same thing, and the delay is not weakness — it is pardon."))

N[7] = dict(type="text", title="'Why has no sign been sent down'", text=(
    "The demand is for a sign of the kind Mūsā and ʿĪsā brought. The reply sets the Prophet's ﷺ role: a "
    "warner, and — in the second half — every people has a guide. Ibn Kathīr records the reading that the "
    "guide is the Prophet ﷺ himself for his people."))

N[8] = dict(type="report", title="The keys of the Unseen", source="bukhari_4697", text=(
    "Bukhārī places this āyah at the head of a chapter in his Tafsīr, under Ibn ʿUmar's report that the "
    "Prophet ﷺ said the keys of the Unseen are five and named them: what is in the wombs is one of the "
    "five. That report is the reason the āyah is read as a statement about knowledge that is exclusively "
    "Allah's, not merely a statement about birth weight."))

N[9] = dict(type="text", title="al-Kabīr, al-Mutaʿāl", text=(
    "Two names, and a distinction worth keeping: al-Kabīr is greatness in Himself, al-Mutaʿāl is exaltedness "
    "above everything He made. The next āyah explains why the distinction matters — nothing at all is out "
    "of range of that knowledge."))

N[10] = dict(type="text", title="Secret and public", text=(
    "A person hiding under cover of night and a person walking openly in daylight are, in this āyah, doing "
    "the same thing: being seen. The pairs are deliberate — concealed and proclaimed, night and day."))

N[11] = dict(type="report", title="The guards who take turns", source="bukhari_555", text=(
    "The 'successive' angels of this āyah are named in Bukhārī from Abū Hurayrah: angels come to you in "
    "succession by night and by day, and they meet at Fajr and ʿAṣr. They protect by Allah's command and "
    "they report. The second half of the āyah is the one people quote most — that Allah does not change a "
    "people's condition until they change what is in themselves — and it sits inside that image: the guard "
    "changes shift, the record is read, and the state of a people is not a thing that happens to them."))

N[12] = dict(type="text", title="Fear and hope in one flash", text=(
    "Lightning produces both at once. That is the āyah's whole argument against a religion of pure terror "
    "or pure comfort: the same sky frightens and relieves."))

N[13] = dict(type="report", title="What the thunder is", source="tirmidhi_3117", text=(
    "The Jews of Madīnah asked the Prophet ﷺ directly what the thunder is, and the answer is preserved in "
    "Tirmidhī: an angel among the angels, placed over the clouds, driving them with goads of fire; and the "
    "sound is his driving. Al-Tirmidhī graded the report ḥasan ṣaḥīḥ gharīb; Darussalam prints it ḥasan. "
    "It is the only report in the collections that answers this question, and it is the reason this sūrah's "
    "name is a name of an angel's work, not a weather phenomenon."))

N[14] = dict(type="text", title="Hands stretched to water", text=(
    "The image is exact: a man at the edge of water, opening his palm toward his mouth, waiting for the "
    "water to arrive. The idols are not being mocked for being far away. They are being described as unable "
    "to move toward the one who calls."))

N[15] = dict(type="text", title="Willing and unwilling prostration", text=(
    "Everything in the heavens and the earth prostrates — some willingly, some under compulsion — and the "
    "shadows prostrate morning and evening. The shadow is used because it cannot refuse: it follows the "
    "body that is bowing, wherever the sun is."))

N[16] = dict(type="text", title="The question they could answer", text=(
    "A single question is put to them: who is the Lord of the heavens and the earth? The sūrah does not "
    "let them dodge it. Once the answer is given, the next question is fatal to the idols: can a thing that "
    "cannot help or harm itself be a trustee for anyone else?"))

N[17] = dict(type="text", title="The flood", text=(
    "The central image of the sūrah. Water from the sky, valleys each flowing to their own capacity, a "
    "torrent carrying a rising scum; then ore in the fire throwing up a scum the same. Foam goes as jetsam. "
    "What benefits people stays in the earth. Al-Mukhtaṣar reads the two pictures as one statement: falsehood "
    "is the scum on the surface of truth and on the surface of wealth, it rises, it looks like the thing "
    "itself, and it is the first to leave."))

N[18] = dict(type="text", title="The price they would pay", text=(
    "Those who responded have the best reward. Those who did not would, on that Day, offer the whole earth "
    "and its like again to buy themselves out. The āyah is careful: it does not say the offer would be "
    "refused for lack of value. It says the reckoning is not a transaction."))

N[19] = dict(type="text", title="The blind and the seeing", text=(
    "A rhetorical question with a fixed answer, and then a surprising restriction: only people of "
    "understanding take the reminder. The sūrah is telling you what kind of reading it expects."))

N[20] = dict(type="text", title="The covenant", text=(
    "From here to āyah 24 the sūrah gives the portrait of the people it has been describing. It begins not "
    "with feeling but with contract: they fulfil the covenant of Allah and do not break the pledge."))

N[21] = dict(type="text", title="Joining what was ordered joined", text=(
    "The phrase is broad on purpose — kinship, ties of faith, obligations — and al-Mukhtaṣar names kinship "
    "first. What is being described is a person whose default is to connect, not to cut."))

N[22] = dict(type="text", title="Patience, prayer, spending, repelling", text=(
    "Four actions in one āyah: patient, praying, spending secretly and openly, and repelling evil with good. "
    "The last is the hardest and the sūrah puts it in the same sentence as prayer."))

N[23] = dict(type="text", title="The gates", text=(
    "The garden is entered with the righteous among fathers, spouses and children — an unusual detail, and a "
    "deliberate one: the reward is social. The angels come in from every gate."))

N[24] = dict(type="text", title="Peace, and the reason for it", text=(
    "'Peace be upon you for what you patiently endured.' The angels do not congratulate them for what they "
    "achieved. They name the patience."))

N[25] = dict(type="text", title="The counterpart", text=(
    "The āyah is built as a mirror of 20–21: same vocabulary of covenant, joining and severing, inverted. "
    "Nothing new is introduced — the same actions, the opposite end."))

N[26] = dict(type="text", title="Provision is not a verdict", text=(
    "Wealth expands and contracts by Allah's will; rejoicing in the world is a category error because the "
    "world is a short enjoyment compared to what is next. The āyah answers the assumption that prosperity "
    "is approval."))

N[27] = dict(type="text", title="The demand again", text=(
    "The same demand as āyah 7, and the same refusal to make guidance contingent on it. Guidance is not a "
    "prize for a good argument; it is a turning."))

N[28] = dict(type="text", title="The heart that settles", text=(
    "One of the most quoted āyāt in the Qur'ān, and it is a diagnosis: hearts are not calmed by certainty "
    "about outcomes. They are calmed by remembrance — and the āyah states it twice, as a claim and then as "
    "its own confirmation."))

N[29] = dict(type="text", title="A good return", text=(
    "Belief plus action, and a promise compressed into four words: a pleasant life and a good return. "
    "The next āyah turns directly to the Prophet ﷺ."))

N[30] = dict(type="report", title="The word they would not write", source="bukhari_2731", text=(
    "The longest, most specific occasion attached to this sūrah is here. Bukhārī's treaty report has the "
    "Prophet ﷺ dictate 'In the Name of Allah, al-Raḥmān, al-Raḥīm' at Ḥudaybiyyah, and Suhayl ibn ʿAmr "
    "refuse: 'As for al-Raḥmān — by Allah, I do not know what he is.' The āyah — 'while they disbelieve in "
    "al-Raḥmān' — is read as coming down on that refusal. The report is ṣaḥīḥ and the āyah's subject, the "
    "denial of the name, is certain. The claim of a specific verbal occasion is what is being reported here, "
    "not a text that identifies the year."))

N[31] = dict(type="disputed", title="The occasion this one claims", text=(
    "Some asbāb al-nuzūl works attach a long report to this āyah: the Quraysh asking the Prophet ﷺ to move "
    "the mountains of Makkah, to bring springs, to raise their dead — and the āyah coming down in refusal. "
    "The report exists in al-Wāḥidī's compilation, but its chain runs through ʿAbd Allāh ibn ʿAṭāʾ from his "
    "grandmother Umm ʿAṭāʾ, and that same transmitter's material is graded weak elsewhere on sunnah.com "
    "(Musnad Aḥmad 1422 is graded daʿīf by Darussalam). The report is therefore not used here as a proof. "
    "What the āyah itself does is enough: it refuses to make the Qur'ān's authority conditional on "
    "spectacle. Ibn Kathīr's reading — that this āyah is the answer to that demand — is a tafsīr judgement, "
    "not an isnād claim."))

N[32] = dict(type="text", title="Mockery is old", text=(
    "A consolation addressed to the Prophet ﷺ, and a warning to the mockers: respite was given before, and "
    "respite is not amnesty."))

N[33] = dict(type="text", title="Who watches every soul", text=(
    "The āyah contrasts the One who maintains every soul and knows what it has earned with partners who "
    "know nothing. Then it puts a challenge in the Prophet's ﷺ mouth: name them."))

N[34] = dict(type="text", title="Two punishments", text=(
    "Punishment in this life and a harder one after it, and no protector. The sūrah has already said what a "
    "protector is worth in āyah 11; here it says what it means to have none."))

N[35] = dict(type="text", title="Lasting fruit, lasting shade", text=(
    "The garden is described by two things that, in this world, never last: fruit and shade. The pairing is "
    "the point. It is not a bigger garden; it is the end of the decay the reader knows."))

N[36] = dict(type="text", title="The People of the Book who rejoiced", text=(
    "Some of those given the earlier scripture rejoice at what is revealed. The āyah is careful to say "
    "among the factions, there are those who reject part of it — so the response of the People of the Book "
    "is not described as uniform, either way."))

N[37] = dict(type="text", title="Arabic, and the warning to the Messenger", text=(
    "The Qur'ān is given as a decisive Arabic judgement. Then the āyah addresses the Prophet ﷺ himself: do "
    "not follow their inclinations after knowledge has come. A warning in the second person to the one "
    "carrying the revelation is not a small thing."))

N[38] = dict(type="report", title="He was a man with a family", source="bukhari_5063", text=(
    "Ibn Kathīr cites the report in the two Ṣaḥīḥs about the three men who came to the Prophet's ﷺ "
    "households and proposed celibacy, continual fasting and all-night prayer; he answered that he fasted "
    "and broke the fast, prayed and slept, and married women. This āyah makes the same point from the other "
    "direction: every messenger before him had wives and children. Āyah 38 is often quoted at those who "
    "treat the Prophet's ﷺ ordinary human life as a problem rather than the point."))

N[39] = dict(type="caution", title="Erasing and confirming", text=(
    "The āyah that steadied ʿUmar at Ḥudaybiyyah: Allah erases what He wills and confirms what He wills, "
    "and with Him is the Mother of the Book. Al-Mukhtaṣar identifies the Mother of the Book with the "
    "Preserved Tablet, and reads erasure and confirmation as occurring in conformity with it. This is one of "
    "the āyāt that later theology argued over for centuries. This app does not adjudicate that argument; "
    "it shows what the āyah says and what the commentaries said it says."))

N[40] = dict(type="text", title="Only the delivering", text=(
    "The Prophet's ﷺ duty is narrowed to one thing — conveying — and the account is handed back to Allah. "
    "Whether the punishment comes in his lifetime or after his death is not his to decide."))

N[41] = dict(type="text", title="The land diminishing at its edges", text=(
    "Al-Mukhtaṣar reads the shrinking borders as the spread of Islam and the conquests. The classical "
    "readers also took it more generally: territory passing from one people to another, which is what "
    "happens to every power that thinks it is permanent."))

N[42] = dict(type="text", title="The plan that wins", text=(
    "They plotted; the plan belongs entirely to Allah. The āyah is a summary of the whole sūrah's argument "
    "about which of the two efforts is going to remain."))

N[43] = dict(type="text", title="The last word is a witness", text=(
    "The sūrah ends with the accusation and its answer. 'You are not a messenger.' The reply is not a "
    "miracle. It is a witness: Allah, and whoever has knowledge of the Book. The magazine you are reading "
    "exists because that witness has been copied and carried for fourteen centuries."))


def main():
    d = json.load(open(P, encoding="utf-8"))
    for a in d["ayat"]:
        a["note"] = N.get(a["n"], {})
    json.dump(d, open(P, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    missing = [a["n"] for a in d["ayat"] if not a["note"]]
    print("notes", sum(1 for a in d["ayat"] if a["note"]), "missing", missing,
          "size", os.path.getsize(P))


if __name__ == "__main__":
    main()
