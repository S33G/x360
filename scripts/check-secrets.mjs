#!/usr/bin/env node
// Offline, read-only heuristic checks. Never print matched source text.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const findings = new Map();
const skippedDirectories = new Set(['.git', 'node_modules', 'coverage', '.cache']);
const maxTextBytes = 8 * 1024 * 1024;
let checked = 0;

// Reviewed against Mermaid 12.2.0's published npm distribution. These are
// fingerprints of the matched public tokens, not hashes trusted from a build.
// Source references are relative to node_modules/mermaid/dist. Most are numeric
// literals whose decimal/exponent notation also happens to match hexadecimal.
// Do not regenerate this set automatically from output or exempt whole files.
const reviewedVendorTokens = new Set([
  // Three.js 0.186.1: bounding radius, PI reciprocals, AgX color matrices and sampling.
  '9238591c2e02d33f488dd6fa00ea423c8f9ddfc874d0221a32bc3cef2dcd0646', // three.core.js:25959
  '9e00055c2a40799e555b4d0dfac14fb2e3825f0773f4e66fdab463972f620b6d', // three.module.js:343
  'be603bb5da9d7f5489d2f0dfa62c906a5c4367d6b30494391493803ad9ca327c', // three.module.js:343
  'f7b03ef002fd4503520aa688221d174840ddc7fa10fabcee6ae2733286830aae', // three.module.js:499
  '9bf0f20a5afd5ad94c87270f22b073224fffd843f9b51ae82f35dd02e230712e', // three.module.js:499
  '290212e5ae410a8acc1d7dde171902829d16453cb1198f84df1076ad0eca897a', // three.module.js:499
  '167e4c401371837ed55e1017fcba7c857574af90503c93b72729ab0a9261a66d', // three.module.js:499
  '97e332f21f0bfba87dcaf03d5f21769c6c02f604eaf65d0ae6786e4be67d0dc5', // three.module.js:499
  'b522e8b95675016003e79b5a0e351e13c1013e5e08612404d7f02248d3b7f967', // three.module.js:499
  '57d8431b8a9ef194e98660e6ead3e0a1a9ee2ff29fb0bc9d7c8d6694791a4f1c', // three.module.js:499
  'aabbf6ab1f2ad23aa35185a7a71e3a71dc32d655ee26bbbd453303da1e9ef6a9', // three.module.js:499
  '5c39f0b8cdef7a96baad32855515f32cf724516fee6eddfc49a39a0ab1de7bbe', // three.module.js:499
  '1967f161fe6566edefd57ac5afc6d80d54355f9728a21efe37a0b2f4877291fc', // three.module.js:499
  'bfd6e21feeae95b8db65f5ceba2e1e6055fa121011516a1a3c85a0e6ed0fe52f', // three.module.js:499
  '09f49d6590b6f95909977e21c734182d07cc9e36c541ea0d6f7783b5a49a6b0a', // three.module.js:3391
  '9f9f5111f7b27a781f1f1ddde5ebc2dd2b796bfc7365c9c28b548e564176929f', // Hex alphabet; mermaid.js:35005
  '7c1d5a9a10952ffd32423caa442124fe3dd8a79d1eeb3c5d7ccb772fc346e0f2', // ELK angle constant; mermaid.js:89478
  '3d3a9b49aa606b767e252889b0fda50bc28b71ed8291388b67f0b8f37aa6af0c', // ELK numeric literal; mermaid.js:118245
  '3d53655513066c9306be48673ee752ca9b7324d10faa878ca7dcca45dde40879', // ELK numeric literal; mermaid.js:118245
  '95a0b156a116ce6e45e4a7cb64216cd570fa21bd3209d4b7fc77491b0c2140a2', // ELK numeric literal; mermaid.js:130287
  '8753edd03d754b3266c448abe24e6d04e08d3c23466e2ba18219b31ccc9cfb19', // ELK numeric literal; mermaid.js:130287
  '2724d2fb067de1167d84f437edb811677805b9784f6e9f892d19e5c1ce7247e7', // ELK exponent literal; mermaid.js:130285
  '78a70eec5483d68ee27b11f1ffa85a34c356f809b52fd86250c10a067b1b44a9', // ELK exponent literal; mermaid.js:130285
  'd49f37ee3fe3b6729269a50d3c26ec90d230aff209750ff79f86d882db624c8e', // Color fraction; chunks/mermaid.esm.min/chunk-FWWDAFD2.mjs:4
  '05d98b961ed28338ea93dccd970cf2ac6b872afa14d813424bcb31106acc5ea5', // Maximum floating-point value; mermaid.js:53840
  '2cdb26265b4dc65e3b44d694f121fd6de99b9e4b8ae7f08d84bfa9537635ae43', // Unsigned integer bound; mermaid.js:130287
  '0106e81d189af57f0e6f1e807ccb8626c1cd32285b3453420bd96165c7a7de0b', // ELK numeric literal; mermaid.js:125143
  '674b4f9082f4828626d3e52088ed05c4542b81df729a600204a0a0826288296c', // ELK numeric literal; mermaid.js:130287
  'e1e55eb3e0214c923048a495dab6fd5e0d256b3df8b24926e63e4eb35dc1b66e', // ELK numeric literal; mermaid.js:130285
  'a088eff91e38dff1bbed9bacdb1522671eabab26b8ec76130efba0dbb9e67c6a', // Color fraction; chunks/mermaid.esm.min/chunk-FWWDAFD2.mjs:4
  '2541ab77ba69e2c4cc1f49476d4cea8aed591070837dd6ea03dbce6aa55d96f8', // ELK clamp bound; mermaid.js:83689
  'b24ab47e18e0168ef8a154cdc527563743029778cf4b876db8c7a316d7e366f0', // ELK exponent literal; mermaid.js:86945
  '61743bb9565ed6a4633af8ad55c0856d1c59ed336786c1022c43f39d445f05f5', // ELK numeric literal; mermaid.js:52278
  '4a7210bb964059c215f3a5d07ab67c334635df11bbfa0c0973ee30ba73f6d368', // ELK exponent literal; mermaid.js:130285
  '00b44e555e3173763826b0d401046ef4c6273abd83950c2c957c3190cc2fbbdd', // ELK progress fraction; mermaid.js:143079
  '6d719c54bb6f1e806f60527ce5805562e2134164cdcdf2c90fa02860fb6bb5c3', // Color fraction; chunks/mermaid.esm.min/chunk-FWWDAFD2.mjs:4
  'e720c2f65e9142d31ea06442446096344733614ecf74d8526d0dae957e4e1939', // Logarithm constant; mermaid.js:94955
  '1fad1fdfbcfadcd126607c8ecccf5e418a22d3c552ae185365660ad6ac77559e', // Angle constant; mermaid.js:52283
  '36b5dd686a0a803a855a1ea782d5059a00605b762d9fd76066a7676306987cff', // Drawing radius; chunks/mermaid.esm.min/journeyDiagram-5CPKFXFQ.mjs:139
  'f40b423c2dd95ff2b2f027e22208f438cf7242862e5e746860e697308c9add26', // Maximum safe integer; mermaid.js:54307
  'c5c29af0c2b1ba23907ca40686689919361601e7740335050476b290f2f87ee8', // Signed integer bound; mermaid.js:102701
  'a2cdde00a7bb9fe088edff5e6d5d3bba86c7a6161f2096f64961864f2d4d25f3', // Signed integer bound; mermaid.js:99978
  '2343c5299b2223ea4010aa337184b08a0e47289ee344d382c609342abf56d187', // ELK angle constant; mermaid.js:130287
]);

// Exact decimal parser-table sequences reviewed in Mermaid 12.2.0.
// These overlap the byte-sequence detector; unknown sequences remain findings.
const reviewedVendorByteSequences = new Set([
  '63db506fa1407ef7f58a5065cf00fd9ce40a589843c8ba9c09f4f3345ed2d1df', // mermaid.min.js:2064
  '4cc3a279fea482d1f2dc443b491c82d3c02374a58dfff4d818a7e5cf235ce1c4', // mermaid.min.js:1379
  'f1a58f85f82c702088c9b3a16c02f2bbc5f82ee3afd6c7d98745692591d11f4d', // mermaid.min.js:1722
  '0b7d03827c59c23fb88907e7c4da342bb498ad723d8fbd7feeea2bc346687059', // mermaid.min.js:1189
  '15134b0392fd9937ed40780a25e8a511eacf431af38c67bd97e79dccf6b493c1', // mermaid.min.js:950
  'e584ab7eeb16c2edf098b4a8e508f816b167711a9a7081371d899cdfb91d47ca', // mermaid.min.js:2531
  'b13bffec07e3e6a9690607925348b58b8e128d55d0b9a8faa83364d02fb0ef91', // mermaid.min.js:1189
  'bfd330c889cc0764dfd2eb2266a133c7c314bcfaa8b3333a3604d33406478faf', // mermaid.min.js:1189
  '410a9d1168512079450fc8b0fd0a884fc952f0c9bb2abcd9b5e41d9a8a4dd113', // mermaid.min.js:1189
  '3faa4c7042f0bd941532aa69e44a34d61dcdface77af9b89fe3728e4572dece2', // mermaid.min.js:950
  '0ecd62a4cca67bdc797e4b082d2a3b82ba83560fed8a094a17b8cf4422041240', // mermaid.min.js:1717
  '09c4ca34f3fcd0f36c14bb9ae1fcf350e393605db351c5b59608a4410a62a09e', // mermaid.min.js:2047
  'aacf8ed0546966119a27ba94dc1f46b4b391e180469cf99de31a4c4666a7ab6b', // mermaid.min.js:2047
  '8d5ab07aaec2c67bb0db295c4276c6d0b175039e1abd704031bf54d08470966f', // mermaid.min.js:2047
  '70e9c764e3897ea22b6e2d5e3d24a16ad751a97876f5e51e0accfd4ea0eac731', // mermaid.min.js:2053
  '3d1557ba69718357392c3d5c45712a114278898938877e730b012cc77419f68b', // mermaid.min.js:272
  '313cff45e7f3672d855849b6389c4cdbf0385584e48d2a5199a932e4d45c9b98', // mermaid.min.js:2052
  '31bfc2f2e7b3315e41e6d64f228f75217406e31807db80820a849a16f9a1d808', // mermaid.min.js:2315
  'fb2b7f4d3318236379aac01574202bc90d47cdb270d9a2efe5c1517d1aa65c8a', // mermaid.min.js:2142
  '2b228bd725595637ce17b37a875f799e8b768c927197402b9e24dfb9b96f4970', // mermaid.min.js:2142
  'aca49dd6ab2500fa9977054a9a37fd3703c82fdb45e127f690eb7191cc9297c9', // mermaid.min.js:2531
  '26a3e09dedf48c39049d53487519493282f976cbad692ac789c424d06747939c', // mermaid.min.js:2315
  'ff2c4eebd05734c8b43be972af13db89ca4be2077b956cf88eadbf3471e39aa8', // mermaid.min.js:2059
  '6ae05561d93a8b31b94c00ef75cbc838e651756a96821f00270a9dc21d1f7e11', // mermaid.min.js:2059
  '7a9923e0e6777bb4f6e726f63db6dd39d3b137255d2ebb460626f76455205af8', // mermaid.min.js:2059
  'e932e0925d33eb37f4ec4545b57d7ad7877eece511225865652684227ae14472', // mermaid.min.js:2059
  '58d2ea449f0a73fc71b6205be5893e387d79b061a06a4cfd663e4df3fb858849', // mermaid.min.js:2059
  '4c41e5c4f41cb5e5f71dc73441e021d4a1460e867f3b5dd6dae730e984002084', // mermaid.min.js:2058
  '070ccc3f374cb0e9c3ffcd2ee2992012babb72e7e3102a0fafc4e2aae82887c8', // mermaid.min.js:3365
  '605599e05dd4477f60b3ed94be9730eee3330c60b2ede03afcba0abdadcf7b0c', // mermaid.min.js:2058
  'bfa6d07c238bb6e97fff82d1fbb2b508e823ad55ccdaf436580cde23992b936e', // mermaid.min.js:2058
  'd84b9eda85e799e9f623fe5cc4f3fa616f6091cd901fb27ae95feb3092f6e7d1', // mermaid.min.js:2058
  '4f1f7e2477ac6e599f583bf36d53c5d2ba939ef3eb5bd37586344b49791809af', // mermaid.min.js:2058
  '4ecd4ee7617aa8120ab3c4d81c0603155e1d11b525678c627bb59db302166708', // mermaid.min.js:2310
  '9b795963cc4a0890ab02b95ad5a69d0ced56e2a7b7baee4f896628c58fdf35b2', // mermaid.min.js:2310
  '3ed82d5f225dbd484f005f7ab889bd16a40666ce31ce26e123fddfb991185b91', // mermaid.min.js:2310
  '02e6ff5b2ee8298249a077038ef4cfbdfa32de6c37e8b61343cdfae67cb59ddf', // mermaid.min.js:1374
  '9f53d5e279c7db01161c222967f4d594de01c914d0523ae289e7206327ea4c54', // mermaid.min.js:267
  '6b8211a6158160b9c1ebed30b0792b0f508bcfb585475af5bbd6a5e81c8dc88e', // mermaid.min.js:1374
  'f2752d311914873505c05947c720c172f0afbfc0de33321edf4ea781614bef56', // mermaid.min.js:955
  '88bfa7b5cb08f76b3fdd2028758a752e1bf0b5a3cee9cd206ec84b3a23f0a032', // mermaid.min.js:2526
  '8c7062310262a61efafdb3ebffb1970a27700990a533f59426e99c2720cd7105', // mermaid.min.js:267
  'f42a78b68191d72e8204bdaceea418ccfbf4c20ff97a943f5bba69543d46a6cf', // mermaid.min.js:605
  '4bc9f58c3ba201679c7d93e0010352e808661f42563cf6a7b95f100d9e8c74dc', // mermaid.min.js:2147
  '7f04d4366580c4098b72b0cbae8747355730ad980fdbb453539baa01968d655e', // mermaid.min.js:2526
  '3720cefaa895802703bf906be03c0c7311458de4161bfee33c4db6b1244a0175', // mermaid.min.js:2526
  'b4da6cee32982d40bbb1779f9c91b1946458ea55dc9189b394257b24c2c28b5c', // mermaid.min.js:2315
  '282395e9b5bf4c516f0f721c9396d4b470246aaa088b28623aafc48900b99752', // mermaid.min.js:1374
  'a68c327a5cc1827caffb6c25e3ea36a5917205cd8718dba79cb19f0a66a19544', // mermaid.min.js:1374
  '46b0cb2b02548ac434235edb0f6b04eee8bebd1304054367f9cad594443feb3e', // mermaid.min.js:1194
  'a463d8ea9fcdf64f455f824569d31ea3b2c73707a098150baa86a20ad4880260', // mermaid.min.js:955
  'a0ad4998a84416360ca9d450fc508f4f75f0d01c75f403c84eef94c2017d4ff6', // mermaid.min.js:2315
  'bb7c002e3f75e4f9622672ebb81c6c51552308ea7d65e34c1f911d48ccfc472a', // mermaid.min.js:2315
  '702e169995123c1f09545798cffc2b18f475bc271e16db12a66e2e7d50c977b5', // mermaid.min.js:2310
  'de1173683a267339dd3e797af519ea14f976d5d44b44a1c9de38705767c9be6e', // mermaid.min.js:272
  '1af2016783cdee495792925c7a1cb11cdc6096d9c99e3915ac389a42e1e84a35', // mermaid.min.js:2315
  '032614abd0eeca0e39b2f46449dfe62d6169d7be3c49b340a04cc84875b17cbd', // mermaid.min.js:2315
  '8cbf14b9c878f930ab8f3fcae7d9df58df24c38dcefbe6c354bccacf67c307e1', // mermaid.min.js:2315
  '6baff478d763baa9853ab119313025135afc60dffe8535d1fb9c556c470544e8', // mermaid.min.js:2315
  '95629b5547a004bccbc733d657cf7ad9754875ec75fb43e4a7a16c1deadc3c0e', // mermaid.min.js:2315
  '71ca56643601d8696f6b6d2b86d4d82c67e7c14ad333500fca05fac2c4b2cf50', // mermaid.min.js:2315
  'fd6273d3dfc98850dff7dc63555841f49fa7841480b0392ea588efeac9a3044c', // mermaid.min.js:2315
  'fb331ddb44f84c7109206dc721e9e30dd9a93551e243b6df0adf535637486c20', // mermaid.min.js:272
  '054460dd81a8207ee9e70a3e72b888008806a736b6f9feb9ea44801811ca0341', // mermaid.min.js:2047
  '6a7766adefba14cf26f024a3f38b4d6e1db412b36a27da060d65e069fe5d2d9b', // mermaid.min.js:267
  '2bbf72af35bd67035ead0d9399591fd0602012109cb9c36f9e6ac741778e50e8', // mermaid.min.js:272
  '988c348c600c586f35eda154f82e6900869640f0dcb0c2256ef15f18a7bdbc0e', // mermaid.min.js:2147
  '39110a70bdf8249b3b244373147f4ce2680b098c810a1d63320383d9904cc0b2', // mermaid.min.js:272
  'c6cd6f83ab9f9fc8c45bcc48ec0367535cd790a8ebe37f23530a774bfb07924f', // mermaid.min.js:955
  '7215efb8a049f793d478cb7d589589f2097ab20ea48f2f54be6d596a3333b060', // mermaid.min.js:1194
  '6a557bb191cd9fe8cd5674c06b63fbfcdb3565bc6dd75fcc01d27338fd6e8ee5', // mermaid.min.js:272
  'a5c0f859eb2c82dab779e037915c9850dae919fc6c0af86d42118c9c34d8e268', // mermaid.min.js:2064
  '30e12803a7d47512c548a7a7951663fd9b02aca12a3a6397a95e7bedc6188a5b', // mermaid.min.js:2142
  '361df37646ed73a39ef45424c5360324d232c5d24774a1e339353317063e214c', // mermaid.min.js:267
  '7943071aaf50eb84e88bb75778ee174f7b6f72f3b859f9705ade1d50da6b288e', // mermaid.min.js:605
  'b8b73233f622992f116f675d9e5fb2f1c9dc06296562646f3fb8b5b34299bf8c', // mermaid.min.js:267
  'eef1d5affb62b5e0c960a61f68b177d7f370459e7dcd9e216a8d8312eb0636d6', // mermaid.min.js:267
  'bf5abeb4bf34e0039800fa5871c8dafc1da683382387a46663bd4b5086ba2e90', // mermaid.min.js:267
  '91e16570f30c4164a0f645f87b05ad93f1f6a8bdca9b400b989bc62db6ba8e78', // mermaid.min.js:2315
  '35151e76bdf225a1965968b4d1b4290d65e315105d37355a4b9ab887028e1d58', // mermaid.min.js:267
  'dac415bf9e13016259872349641d97c0ae4358ddfd9518d6f23ed88aba030c76', // mermaid.min.js:267
  '814eb7ec1df5a3c5ec17664da4d1cc2930b451265478c6553018c62979cd30be', // mermaid.min.js:267
  '69912d6438ba0364efd18e1f512ab94d975e0d1c5476fa2c786191f95979b77e', // mermaid.min.js:2315
  '996bdc3fdcdde56606254803957716485400b4913eee4c9a4ca74f1a6d8622d0', // mermaid.min.js:2315
  'de2227ece62d5e90d208cd231d69c0ee8842a268e1acc0084da5a8b1643a08c3', // mermaid.min.js:605
  '6bf6d3466d52d55eb8588c5959f7fc16087ce61802ea33d20522523c6e6de3c7', // mermaid.min.js:2059
  '0e6d428ee2ebcc096fd4716a37a1ad6de6520c6978646616bf5ffd0674598b24', // mermaid.min.js:2147
  'efefb22c372fb4ef9343523300430398b70187055daeca8fb0c3842db770c0e8', // mermaid.min.js:2147
  'a613c06c6fe4dc967ba3249aba3969c991cb468719c9ee929eb76ff649da7dd2', // mermaid.min.js:2147
  '8356b85697fd927080ee42a674bcf9e74030cc421d6e517a32f8732e1c087a11', // mermaid.min.js:2142
  '7bc812ee95d9b3854dc9db0e8adb48fe09d138ba98ee4f55b73326b95e243fe3', // mermaid.min.js:2147
  '6d7497e01165089d129e315200730287e2df4e1e3321c5d9eceaa3585d689a6b', // mermaid.min.js:955
  '902ad79c6eda5dd46f72b7477891969c27434dbacfbc988d3d568d332d19ba70', // mermaid.min.js:1194
  '9e63286d6d58aab85f4f670bda18ec4036cb81fd801999c369c6d74ed71227ad', // mermaid.min.js:2315
  'd499e60541fa0415e4260d36a4cc0cbe2edbf035749b80d717fd109c7c1939bf', // mermaid.min.js:2147
  '4618a10409d9dae096a11af0c68691bf1de0c6202fd3bc7fcc9988ab0d9482c5', // mermaid.min.js:2142
  '835120ecd6c31412d9e29774e81a7f16119c7d56e88ddaadb4eadb1c48eb7fbf', // mermaid.min.js:2147
  '82f167a72755ca283ed6179e5594209e46f6d0c03bcb4852691dc1b90d626cfc', // mermaid.min.js:2315
]);

function artifactName(name) {
  return /\.(?:bin|nand|dump|img|iso|ecc|xbe|xex|vhdx?)$/i.test(name)
    || /^(?:cpukey|dvdkey|keyvault|fuses)(?:[._-]|$)/i.test(name)
    || /^kv[._-](?:dec|en|enc)(?:[._-]|$)/i.test(name)
    || /^extracts?(?:[._-]|$)/i.test(name);
}

function safePath(filename) {
  return filename.split(/[\\/]/).map((part) => (
    artifactName(part) || /[a-f0-9]{10,}/i.test(part)
      ? '[REDACTED_NAME]'
      : part
  )).join('/');
}

function report(filename, line, type) {
  const item = { path: safePath(filename), line, type };
  // Deduplicate repeated versions without conflating different masked filenames.
  findings.set(JSON.stringify({ filename, line, type }), item);
}

// Exact, reviewed public constants only. A matching value elsewhere is reviewed again.
function publicConstant(filename, line, value) {
  // One public Sketchfab asset ID is permitted only in its full source URL and
  // the reviewed source/build locations. It is not a console key.
  const modelUrl = 'https://sketchfab.com/3d-models/classic-xbox-360-white-edition-' + ['a88f9340', '3ba64726', 'a4b68611', 'db420a67'].join('');
  const modelFiles = ['site/model-config.mjs', 'docs/CREDITS.md', 'assets/console-model.LICENSE.md', 'dist/assets/console-model.LICENSE.md', 'dist/docs/CREDITS.md', 'dist/docs/CREDITS.html', 'dist/index.html', 'dist/search-index.json'];
  if ((modelFiles.includes(filename) || /^dist\/assets\/vendor\/[^/]+\.js$/.test(filename))
    && value === modelUrl.split('-').at(-1) && line.includes(modelUrl)) return true;
  // Unknown tokens and all other rules still run, including when a secret
  // shares a line with a reviewed public constant.
  if (value.length < 32 && /^dist\/assets\/vendor\/[^/]+\.js$/.test(filename)) {
    const fingerprint = crypto.createHash('sha256').update(value.toLowerCase()).digest('hex');
    if (reviewedVendorTokens.has(fingerprint)) return true;
  }
  if (filename === 'docs/PEER_PRESSURE_GUIDE.md'
    && value === '0'.repeat(16) && /Content\//.test(line)) return true;
  // Published RC4 "Key" / "Plaintext" known-answer vector in retired probe history.
  const rc4Vector = ['BB', 'F3', '16', 'E8', 'D9', '40', 'AF', '0A', 'D3'].join('');
  return filename === 'tools/analyze4.js' && /RC4 test vector/.test(line)
    && value.toUpperCase() === rc4Vector;
}

function scanText(filename, content) {
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    const number = index + 1;
    for (const match of line.matchAll(/(?<![a-z0-9])[a-f0-9]{16,32}(?![a-z0-9])/gi)) {
      if (!publicConstant(filename, line, match[0])) report(filename, number, 'key-like-hex');
    }
    for (const match of line.matchAll(/(?<![a-z0-9])(?:[a-f0-9]{2}[ ,:-]){15}[a-f0-9]{2}(?![a-z0-9])/gi)) {
      const fingerprint = crypto.createHash('sha256').update(match[0].toLowerCase()).digest('hex');
      const reviewed = /^dist\/assets\/vendor\/[^/]+\.js$/.test(filename)
        && reviewedVendorByteSequences.has(fingerprint);
      if (!reviewed) report(filename, number, 'key-like-hex');
    }
    if (/\b(?:serial(?:\s+number)?|console[ _-]?id)\b[^\n]{0,60}?(?:\b\d{12}\b|\b[a-f0-9]{10}\b|\b(?:[a-f0-9]{2}[ :-]){4}[a-f0-9]{2}\b)/i.test(line)) {
      report(filename, number, 'console-identifier');
    }
    if (/(?:\/(?:Users|home)\/|[a-z]:[\\/]+(?:Users|Documents and Settings)[\\/]+)(?![<{$])[^\s'"`<>\\/]+/i.test(line)
      || /\/private\/var\/folders\/[a-z0-9]/i.test(line)) {
      report(filename, number, 'personal-absolute-path');
    }
    if (/\b(?:KV|Keyvault)\b.*(?:`|=|:)\s*(?:[a-f0-9]{2} ){3,}[a-f0-9]{2}/i.test(line)) {
      report(filename, number, 'sample-keyvault-bytes');
    }
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(line)) {
      report(filename, number, 'private-key-material');
    }
    if (/\b(?:AKIA[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{15,})\b/.test(line)) {
      report(filename, number, 'credential-token');
    }
    const assignment = line.match(/\b(?:password|passphrase|api[ _-]?key|access[ _-]?token|auth[ _-]?token)\b["']?\s*[:=]\s*(.+)$/i);
    if (assignment) {
      const value = assignment[1].replace(/^["'`]/, '').trim();
      if (value.length > 3 && !/^(?:[<${]|process\.|os\.|env\.|YOUR_|REDACTED|undefined\b|null\b|false\b|true\b)/i.test(value)) {
        report(filename, number, 'credential-assignment');
      }
    }
  }
}

function inspect(filename, bytes) {
  checked++;
  if (filename.split('/').some(artifactName)) {
    report(filename, 0, 'sensitive-artifact');
    return;
  }
  if (bytes.length > maxTextBytes) {
    report(filename, 0, 'unscanned-large-file');
  } else if (bytes.includes(0)) {
    report(filename, 0, 'binary-artifact');
  } else {
    scanText(filename, bytes.toString('utf8'));
  }
}

function workingTree(directory = '') {
  const entries = fs.readdirSync(path.join(root, directory), { withFileTypes: true });
  for (const entry of entries) {
    const filename = directory ? `${directory}/${entry.name}` : entry.name;
    const absolute = path.join(root, filename);
    if (entry.isSymbolicLink()) {
      scanText(filename, fs.readlinkSync(absolute));
    } else if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) workingTree(filename);
    } else if (entry.isFile()) {
      if (filename.split('/').some(artifactName)) {
        checked++;
        report(filename, 0, 'sensitive-artifact');
      } else if (fs.statSync(absolute).size > maxTextBytes) {
        checked++;
        report(filename, 0, 'unscanned-large-file');
      } else {
        inspect(filename, fs.readFileSync(absolute));
      }
    }
  }
}

function git(args, encoding = 'utf8') {
  const result = spawnSync('git', args, { cwd: root, encoding, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error('history-read-failed');
  return result.stdout;
}

function history() {
  const commits = git(['rev-list', '--all', '--reflog']).trim().split('\n').filter(Boolean);
  const seen = new Set();
  for (const commit of commits) {
    const entries = git(['ls-tree', '-rz', '--full-tree', commit]).split('\0').filter(Boolean);
    for (const entry of entries) {
      const tab = entry.indexOf('\t');
      const [mode, type, oid] = entry.slice(0, tab).split(' ');
      const filename = entry.slice(tab + 1);
      if (type !== 'blob') continue;
      const identity = `${oid}:${filename}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      if (filename.split('/').some(artifactName)) {
        checked++;
        report(filename, 0, 'sensitive-artifact');
      } else if (Number(git(['cat-file', '-s', oid]).trim()) > maxTextBytes) {
        checked++;
        report(filename, 0, 'unscanned-large-file');
      } else {
        const bytes = git(['cat-file', 'blob', oid], null);
        if (mode === '120000') scanText(filename, bytes.toString('utf8'));
        else inspect(filename, bytes);
      }
    }
  }
}

try {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--history')) throw new Error('invalid-arguments');
  workingTree();
  if (args.includes('--history')) history();
  for (const item of findings.values()) console.log(JSON.stringify(item));
  console.log(`Privacy scan: ${checked} file versions checked; ${findings.size} findings.`);
  process.exitCode = findings.size ? 1 : 0;
} catch {
  // Filesystem/Git errors can include private absolute paths; never forward them.
  console.error('Privacy scan incomplete. Check access and run from the repository root. Usage: node scripts/check-secrets.mjs [--history]');
  process.exitCode = 2;
}
