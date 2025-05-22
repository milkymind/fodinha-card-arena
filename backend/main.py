import random
from collections import deque

NAIPES = ['♣', '♥', '♠', '♦']
VALORES = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3']
ORDEM_CARTAS = {v: i for i, v in enumerate(VALORES)}
ORDEM_NAIPE_MANILHA = {'♦': 0, '♠': 1, '♥': 2, '♣': 3}
ORDEM_NAIPE_DESEMPATE = {'♣': 3, '♥': 2, '♠': 1, '♦': 0}

class Carta:
    def __init__(self, valor, naipe):
        self.valor, self.naipe = valor, naipe
    def __repr__(self): return f'{self.valor}{self.naipe}'
    def forca(self, manilha=None):
        if manilha and self.valor == manilha:
            return 100 + ORDEM_NAIPE_MANILHA[self.naipe]
        return ORDEM_CARTAS[self.valor]

def criar_baralho():
    baralho = [Carta(v, n) for v in VALORES for n in NAIPES]
    random.shuffle(baralho)
    return deque(baralho)

def definir_manilha(carta_meio):
    return VALORES[(VALORES.index(carta_meio.valor)+1) % len(VALORES)] 