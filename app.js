const express = require('express');
const mysql = require('mysql2/promise');
const session=require('express-session')
const bcrypt=require('bcrypt')
const path=require('path')
const app = express();
const PORTA=process.env.PORTA||8081

app.use(express.urlencoded({extended:true}))
app.set('view engine', 'ejs')

app.use(session({
    secret: 'Crypt-2026-Eduard',
    resave: false,
    saveUninitialized: true
}))

const db=mysql.createPool({
    user:'guambe',
    host:'localhost',
    password:'eduardo123',
    database:'f_stack'
})

app.get('/', (req,res)=>{
    if(!req.session.usuarioId)return res.redirect('/login');
    res.redirect('/votar')
})

app.get('/registro', (req,res)=>res.render('res', {erro: null}))
app.post('/registro', async (req,res)=>{
    const {nome,email,senha}=req.body

    try{
        const senhaHash= await bcrypt.hash(senha, 5)
        await db.query('INSERT INTO user (nome,email,senha) VALUES (?,?,?)', [nome,email,senhaHash])

        res.redirect('/login')
    }catch{
        res.render('res', {erro: 'Email já cadastrado'})
        }
})
app.get('/login', (req,res)=>res.render('login', {erro: null}))
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const [usuarios]= await db.query('SELECT * FROM user WHERE email=?',[email]);
        if(usuarios.length>0){
            const usuario=usuarios[0]
            const senhaOk= await bcrypt.compare(senha,usuario.senha)

            if(senhaOk){
                req.session.usuarioId=usuario.id
                req.session.usuarioName=usuario.nome
                return res.redirect('/')
            }
        }
        res.render('login', { erro: 'Email ou senha incorretos!' });
    } catch (err) {}
});

app.get('/votar', (req,res)=> res.render('index', {nome: req.session.usuarioName, erro: null }))
app.post('/votar', async (req,res)=>{
    const {pr,sc,es}=req.body
    try{
        await db.query('INSERT INTO p_votos(p_id) VALUES (?)', [pr])
        await db.query('INSERT INTO s_votos(s_id) VALUES (?)', [sc])
        await db.query('INSERT INTO e_votos(e_id) VALUES (?)', [es])
        res.redirect('/logout')
    }catch(err){
        res.render('index', {nome: req.session.usuarioName,erro: 'Falha ao votar'})
    }

})
app.get('/resultados', async (req,res)=>{
    try{
        const [pr] = await db.query(`SELECT p.nome, COUNT(v.id) AS total FROM pres p LEFT JOIN p_votos v ON p.id = v.p_id GROUP BY p.id`);
        const [sc] = await db.query(`SELECT s.nome, COUNT(v.id) AS total FROM sec s LEFT JOIN s_votos v ON s.id = v.s_id GROUP BY s.id`);
        const [es] = await db.query(`SELECT m.nome, COUNT(v.id) AS total FROM est m LEFT JOIN e_votos v ON m.id = v.e_id GROUP BY m.id`);

        res.render('resultados', {pres: pr, sec:sc, est:es})
    }catch{
        res.send('Falha ao carregar')
    }
})
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.send('Votou com sucesso..!'+ '<a href="/Resultados">Ver resultados</a>')
});

app.listen(PORTA, ()=>{
    console.log(`\nhttp://localhost:${PORTA}`)
})