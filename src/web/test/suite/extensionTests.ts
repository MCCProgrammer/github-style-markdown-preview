// Este ficheiro é um ponto de entrada para os testes
// O plugin testBundlePlugin no esbuild.js substitui este conteúdo durante o build,
// mas manter a exportação aqui garante que funciona mesmo se o plugin não estiver ativo
export { run } from './mochaTestRunner';
import './extension.test';

