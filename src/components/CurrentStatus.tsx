import { motion } from "framer-motion";
import { Info, Zap, Layers, RefreshCcw, Mic2 } from "lucide-react";

const CurrentStatus = () => {
    return (
        <section className="bg-background text-foreground py-24 px-4 md:px-8 border-t-4 border-foreground relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-pen-blue/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-marker-red/5 rotate-45 -translate-x-1/2 translate-y-1/2" />

            <div className="max-w-4xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-3 mb-8"
                >
                    <div className="p-3 bg-pen-blue text-white wobbly-sm shadow-hard-sm">
                        <Info className="w-6 h-6" strokeWidth={3} />
                    </div>
                    <h2 className="font-heading text-3xl md:text-5xl font-black uppercase tracking-tighter italic">
                        Where are we <span className="text-pen-blue">currently?</span>
                    </h2>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    {/* Main Content Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="md:col-span-8 border-4 border-foreground p-8 bg-card wobbly-md shadow-hard relative group"
                    >
                        <div className="absolute -top-4 -right-4 bg-marker-red text-white p-2 wobbly-sm shadow-hard-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            <Zap className="w-5 h-5 fill-current" />
                        </div>

                        <p className="font-body text-lg md:text-xl leading-relaxed text-foreground/90 mb-6">
                            Currently we&apos;ve designed and implemented a <span className="font-bold underline decoration-marker-red decoration-4 transition-all hover:bg-marker-red hover:text-white px-1">sophisticated pipeline</span> which takes the YouTube videos, and converts them into a cultural transcript by running many parallel layers of content verification behind the scenes.
                        </p>

                        <p className="font-body text-lg md:text-xl leading-relaxed text-foreground/90">
                            We have structured a clear pipeline that smoothly takes on the <span className="font-bold text-pen-blue">ASR Transcription</span> and <span className="font-bold italic">transliterates</span> (yup... different than translation) into the target language with local cultural knowledge.
                        </p>
                    </motion.div>

                    {/* Side Highlights */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                        className="md:col-span-4 flex flex-col gap-6"
                    >
                        <div className="bg-postit p-5 border-2 border-foreground wobbly-sm shadow-hard-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <Layers className="w-4 h-4 text-foreground/70" />
                                <span className="font-heading text-xs font-black uppercase tracking-widest">Core Achieved</span>
                            </div>
                            <p className="font-body text-sm font-bold">
                                All cultural objective metrics successfully met across our initial 5 target regions.
                            </p>
                        </div>

                        <div className="bg-white p-5 border-2 border-foreground wobbly-md shadow-hard-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <RefreshCcw className="w-4 h-4 text-marker-red animate-spin-slow" />
                                <span className="font-heading text-xs font-black uppercase tracking-widest text-marker-red">In Development</span>
                            </div>
                            <p className="font-body text-sm text-foreground/80 leading-snug">
                                Working on a <span className="font-black">crucial feature</span> to transform digital consumption:
                            </p>
                            <div className="mt-3 flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-xs font-bold bg-foreground/5 p-2 border border-foreground/10">
                                    <Mic2 className="w-3 h-3" /> Distinguishing Speakers
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold bg-foreground/5 p-2 border border-foreground/10">
                                    <Zap className="w-3 h-3" /> Near Real-time Voice Clone
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Closing Statment */}
                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 }}
                    className="mt-12 font-heading text-center text-foreground/40 font-bold uppercase tracking-[0.2em] text-xs"
                >
                    ✦ Continuous Innovation · Team Nooglers · AI4Bharat Catalyst ✦
                </motion.p>
            </div>
        </section>
    );
};

export default CurrentStatus;
